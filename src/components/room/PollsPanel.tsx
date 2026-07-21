"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { X, Plus, Trash2, BarChart2, Loader2, Check } from "lucide-react";
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

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      const { data: pData } = await supabase
        .from("polls")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      
      if (pData) setPolls(pData);

      const { data: rData } = await supabase
        .from("poll_responses")
        .select("id, poll_id, user_id, option_id"); // need a join if we want to filter by room, but we can just filter by poll_id
      
      if (rData && pData) {
        // filter responses that belong to these polls
        const pollIds = pData.map(p => p.id);
        setResponses(rData.filter(r => pollIds.includes(r.poll_id)));
      }
    }

    fetchData();

    // Subscribe to new polls
    const pollSub = supabase
      .channel(`polls:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "polls", filter: `room_id=eq.${roomId}` }, (payload) => {
        setPolls(prev => [payload.new as Poll, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "polls", filter: `room_id=eq.${roomId}` }, (payload) => {
        setPolls(prev => prev.map(p => p.id === payload.new.id ? payload.new as Poll : p));
      })
      .subscribe();

    // Subscribe to new responses
    const responseSub = supabase
      .channel(`responses:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "poll_responses" }, (payload) => {
        // Only add if it's for one of our polls
        setResponses(prev => [...prev, payload.new as PollResponse]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pollSub);
      supabase.removeChannel(responseSub);
    };
  }, [roomId, supabase]);

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
      setIsCreating(false);
      setQuestion("");
      setOptions([{ id: "1", text: "" }, { id: "2", text: "" }]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <aside
      className="flex w-full md:w-[320px] shrink-0 flex-col border-l border-border bg-[#111827]"
      aria-label="Polls panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Polls</h2>
        <button
          onClick={onClose}
          aria-label="Close polls"
          className="rounded-lg p-1 text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isCreating ? (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-primary">Create a poll</h3>
            <input
              type="text"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-container px-3 py-2 text-sm text-text-primary placeholder-white/30 outline-none"
            />
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt.text}
                    onChange={(e) => setOptions(prev => prev.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o))}
                    className="flex-1 rounded-xl border border-border bg-surface-container px-3 py-2 text-sm text-text-primary placeholder-white/30 outline-none"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => setOptions(prev => prev.filter(o => o.id !== opt.id))}
                      className="p-2 text-text-secondary hover:text-[#DC2626]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 5 && (
              <button
                onClick={() => setOptions(prev => [...prev, { id: Date.now().toString(), text: "" }])}
                className="flex items-center gap-1 text-xs text-[#1A73E8] hover:text-[#1557B0]"
              >
                <Plus className="h-3 w-3" /> Add option
              </button>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 rounded-xl border border-[#374151] py-2 text-xs font-medium text-text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                disabled={isSubmitting || !question.trim() || options.some(o => !o.text.trim())}
                className="flex-1 rounded-xl bg-[#1A73E8] py-2 text-xs font-medium text-text-primary hover:bg-[#1557B0] disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Launch Poll"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {isHost && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container py-2.5 text-sm font-medium text-text-primary hover:bg-surface-container transition-colors"
              >
                <BarChart2 className="h-4 w-4" />
                Create a Poll
              </button>
            )}

            {polls.length === 0 ? (
              <p className="text-center text-xs text-text-secondary mt-8">No polls yet.</p>
            ) : (
              <div className="space-y-4">
                {polls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    responses={responses.filter(r => r.poll_id === poll.id)}
                    userId={user?.id}
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
function PollCard({ poll, responses, userId }: { poll: Poll; responses: PollResponse[]; userId?: string }) {
  const [isVoting, setIsVoting] = useState(false);
  const totalVotes = responses.length;
  const userVote = responses.find(r => r.user_id === userId);

  async function handleVote(optionId: string) {
    if (userVote || !poll.is_active) return;
    setIsVoting(true);
    try {
      await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, optionId })
      });
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-container p-4">
      <h3 className="mb-3 text-sm font-medium text-text-primary">{poll.question}</h3>
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const votes = responses.filter(r => r.option_id === opt.id).length;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = userVote?.option_id === opt.id;
          
          // If the user has voted or the poll is closed, show results. Otherwise show buttons.
          const showResults = !!userVote || !poll.is_active;

          return (
            <div key={opt.id} className="relative overflow-hidden rounded-lg bg-surface-container">
              {showResults && (
                <div 
                  className="absolute bottom-0 left-0 top-0 bg-[#1A73E8]/30 transition-all duration-500" 
                  style={{ width: `${percentage}%` }} 
                />
              )}
              <button
                onClick={() => handleVote(opt.id)}
                disabled={showResults || isVoting}
                className={cn(
                  "relative flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                  !showResults && "hover:bg-surface-container",
                  isSelected ? "text-text-primary" : "text-text-secondary"
                )}
              >
                <span className="flex items-center gap-2 relative z-10">
                  {isSelected && <Check className="h-3.5 w-3.5 text-[#1A73E8]" />}
                  {opt.text}
                </span>
                {showResults && (
                  <span className="text-xs text-text-secondary relative z-10">{percentage}%</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-right text-[10px] text-text-secondary">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
