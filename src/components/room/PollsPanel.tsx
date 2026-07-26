"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { useRoomContext } from "@livekit/components-react";
import { CloseCircle, AddCircle, Trash, Chart, TickCircle } from "iconsax-react";
import { cn } from "@/lib/utils/cn";

interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  id: string;
  room_id: string;
  question: string;
  options: PollOption[];
  is_active: boolean;
  created_at: string;
}

interface PollResponse {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
}

interface PollsPanelProps {
  roomId: string; // The DB UUID
  roomCode: string; // The URL code
  isHost: boolean;
  onClose: () => void;
}

export default function PollsPanel({
  roomId,
  roomCode,
  isHost,
  onClose,
}: PollsPanelProps) {
  const { user } = useUser();
  const supabase = createClient();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [responses, setResponses] = useState<PollResponse[]>([]);
  
  // Create Poll State
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([{ id: "1", text: "" }, { id: "2", text: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const room = useRoomContext();

  const fetchData = useCallback(async () => {
    const { data: pData } = await supabase
      .from("polls")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    
    if (pData) setPolls(pData);

    const { data: rData } = await supabase
      .from("poll_responses")
      .select("id, poll_id, user_id, option_id"); 
    
    if (rData && pData) {
      // filter responses that belong to these polls
      const pollIds = pData.map(p => p.id);
      setResponses(rData.filter(r => pollIds.includes(r.poll_id)));
    }
  }, [roomId, supabase]);

  // Fetch initial data and setup LiveKit Data Channel listener
  useEffect(() => {
    fetchData();

    if (!room) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDataReceived = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
      if (topic === "polls_updated") {
        fetchData();
      }
    };

    room.on("dataReceived", handleDataReceived);
    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [fetchData, room]);

  async function handleCreatePoll() {
    if (!question.trim() || options.some(o => !o.text.trim())) return;
    setIsSubmitting(true);
    try {
      await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          question,
          options: options.map(o => ({ id: o.id, text: o.text.trim() }))
        })
      });

      // Broadcast update to peers
      if (room) {
        const payload = new TextEncoder().encode("updated");
        await room.localParticipant.publishData(payload, {
          reliable: true,
          topic: "polls_updated"
        });
      }

      setIsCreating(false);
      setQuestion("");
      setOptions([{ id: "1", text: "" }, { id: "2", text: "" }]);
      
      // Update our own view
      fetchData();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <aside
      className="flex h-full w-full flex-col bg-[#FAFAFA]"
      aria-label="Polls panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Polls</h2>
          <p className="text-xs text-slate-500 mt-1">
            Ask questions and gather opinions.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 ml-4 shrink-0 transition-colors"
        >
          <CloseCircle size={24} variant="Linear" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isCreating ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Create a poll</h3>
            <input
              type="text"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
            />
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt.text}
                    onChange={(e) => setOptions(prev => prev.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o))}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => setOptions(prev => prev.filter(o => o.id !== opt.id))}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash size={20} variant="Linear" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 5 && (
              <button
                onClick={() => setOptions(prev => [...prev, { id: Date.now().toString(), text: "" }])}
                className="flex items-center gap-1.5 text-xs font-bold text-[#1A73E8] hover:text-[#1557B0]"
              >
                <AddCircle size={16} variant="Bold" /> Add option
              </button>
            )}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                disabled={isSubmitting || !question.trim() || options.some(o => !o.text.trim())}
                className="flex-1 rounded-full bg-[#1A73E8] py-2.5 text-sm font-bold text-white hover:bg-[#1557B0] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Saving..." : "Launch Poll"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button
              onClick={() => setIsCreating(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Chart size={18} variant="Bold" color="#64748B" />
              Create a Poll
            </button>

            {polls.length === 0 ? (
              <div className="text-center mt-12">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Chart size={24} variant="Bulk" color="#94A3B8" />
                </div>
                <p className="text-sm font-medium text-slate-500">No polls have been created yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    responses={responses.filter(r => r.poll_id === poll.id)}
                    userId={user?.id}
                    onVoteCast={fetchData}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// -- Subcomponent for individual poll --
function PollCard({ poll, responses, userId, onVoteCast }: { poll: Poll; responses: PollResponse[]; userId?: string; onVoteCast: () => void }) {
  const [isVoting, setIsVoting] = useState(false);
  const totalVotes = responses.length;
  const userVote = responses.find(r => r.user_id === userId);
  const room = useRoomContext();

  async function handleVote(optionId: string) {
    if (userVote || !poll.is_active) return;
    setIsVoting(true);
    try {
      await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, optionId })
      });
      
      // Broadcast update to peers
      if (room) {
        const payload = new TextEncoder().encode("updated");
        await room.localParticipant.publishData(payload, {
          reliable: true,
          topic: "polls_updated"
        });
      }
      
      onVoteCast();
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-slate-900">{poll.question}</h3>
      <div className="space-y-2.5">
        {poll.options.map((opt) => {
          const votes = responses.filter(r => r.option_id === opt.id).length;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = userVote?.option_id === opt.id;
          
          // If the user has voted or the poll is closed, show results. Otherwise show buttons.
          const showResults = !!userVote || !poll.is_active;

          return (
            <div key={opt.id} className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
              {showResults && (
                <div 
                  className="absolute bottom-0 left-0 top-0 bg-blue-100 transition-all duration-500" 
                  style={{ width: `${percentage}%` }} 
                />
              )}
              <button
                onClick={() => handleVote(opt.id)}
                disabled={showResults || isVoting}
                className={cn(
                  "relative flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors",
                  !showResults && "hover:bg-slate-100",
                  isSelected ? "font-bold text-[#1A73E8]" : "font-medium text-slate-700"
                )}
              >
                <span className="flex items-center gap-2 relative z-10">
                  {isSelected && <TickCircle size={16} variant="Bold" color="#1A73E8" />}
                  {opt.text}
                </span>
                {showResults && (
                  <span className="text-xs font-bold text-slate-500 relative z-10">{percentage}%</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <span>{poll.is_active ? "Live" : "Closed"}</span>
        <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
