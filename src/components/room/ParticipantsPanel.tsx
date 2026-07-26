"use client";

import { useEffect, useState, useCallback } from "react";
import { useParticipants, useLocalParticipant, useDataChannel } from "@livekit/components-react";
import { Participant } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { Mic, MicOff, Video, VideoOff, Crown, UserX, Hand, Check, Loader2, MoreVertical, ShieldCheck } from "lucide-react";
import { CloseCircle } from "iconsax-react";
import { cn } from "@/lib/utils/cn";

interface WaitingParticipant {
  id: string;
  user_id: string;
  profiles: { full_name: string; avatar_url: string } | null;
}

interface ParticipantsPanelProps {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  onClose: () => void;
}

/**
 * ParticipantsPanel — lists all participants in the room.
 * Hosts see additional controls: mute and remove participant.
 */
export default function ParticipantsPanel({
  roomId,
  roomCode,
  isHost,
  onClose,
}: ParticipantsPanelProps) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  
  // Hand raise state
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());

  useDataChannel("hand_raise", (msg) => {
    const data = JSON.parse(new TextDecoder().decode(msg.payload));
    if (data.type === "HAND_RAISE") {
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (data.isRaised) next.add(msg.from?.identity || "");
        else next.delete(msg.from?.identity || "");
        return next;
      });
    }
  });

  // Waiting room state (Host only)
  const [waiting, setWaiting] = useState<WaitingParticipant[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!isHost) return;
    let isMounted = true;

    function fetchWaiting() {
      supabase
        .from("participants")
        .select(`
          id,
          user_id,
          profiles ( full_name, avatar_url )
        `)
        .eq("room_id", roomId)
        .eq("is_admitted", false)
        .then(({ data }) => {
          if (isMounted && data) setWaiting(data as unknown as WaitingParticipant[]);
        });
    }

    fetchWaiting();

    const intervalId = setInterval(fetchWaiting, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isHost, roomId, supabase]);

  async function handleAdmit(participantId: string) {
    await fetch("/api/participants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, is_admitted: true }),
    });
  }

  return (
    <aside
      className="flex h-full w-full md:w-[320px] shrink-0 flex-col bg-[#FAFAFA]"
      aria-label="Participants panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Participants
            <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {participants.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            People currently in the meeting
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close participants list"
          className="text-slate-400 hover:text-slate-600 ml-4 shrink-0 transition-colors"
        >
          <CloseCircle size={24} variant="Linear" />
        </button>
      </div>

      {/* Waiting Room */}
      {isHost && waiting.length > 0 && (
        <div className="border-b border-[#E5E7EB] px-6 py-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Waiting in Lobby ({waiting.length})
          </h3>
          <div className="flex flex-col gap-2">
            {waiting.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="text-sm font-medium text-slate-900 truncate mr-2">
                  {w.profiles?.full_name || "Guest"}
                </span>
                <button
                  onClick={() => handleAdmit(w.id)}
                  className="flex h-7 items-center gap-1 rounded-md bg-[#16A34A] px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#15803D] transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Admit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto py-2">
        {participants.map((participant) => (
          <ParticipantRow
            key={participant.identity}
            roomCode={roomCode}
            participant={participant}
            isLocal={participant.identity === localParticipant.identity}
            isHost={isHost}
            isHandRaised={raisedHands.has(participant.identity)}
          />
        ))}
      </div>
    </aside>
  );
}

// ── Individual participant row ─────────────────────────────────────
interface ParticipantRowProps {
  roomCode: string;
  participant: Participant;
  isLocal: boolean;
  isHost: boolean;
  isHandRaised?: boolean;
}

function ParticipantRow({
  roomCode,
  participant,
  isLocal,
  isHost,
  isHandRaised,
}: ParticipantRowProps) {
  const isMicMuted = !participant.isMicrophoneEnabled;
  const isCamOff = !participant.isCameraEnabled;
  const displayName = participant.name ?? participant.identity;
  
  let participantIsHost = false;
  try {
    const meta = participant.metadata ? JSON.parse(participant.metadata) : {};
    participantIsHost = meta.role === "host";
  } catch {
    participantIsHost = false; // fallback if JSON parsing fails
  }
    
  const [isActionPending, setIsActionPending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleMuteParticipant() {
    setIsActionPending(true);
    try {
      await fetch(`/api/rooms/${roomCode}/participants/${participant.identity}/mute`, { method: "POST" });
    } finally {
      setIsActionPending(false);
      setShowMenu(false);
    }
  }

  async function handleTurnCameraOff() {
    setIsActionPending(true);
    try {
      await fetch(`/api/rooms/${roomCode}/participants/${participant.identity}/turn-camera-off`, { method: "POST" });
    } finally {
      setIsActionPending(false);
      setShowMenu(false);
    }
  }
  
  async function handleKickParticipant() {
    setIsActionPending(true);
    try {
      await fetch(`/api/rooms/${roomCode}/participants/${participant.identity}/kick`, { method: "POST" });
    } finally {
      setIsActionPending(false);
      setShowMenu(false);
    }
  }

  async function handleRoleChange(role: string) {
    setIsActionPending(true);
    try {
      await fetch(`/api/rooms/${roomCode}/participants/${participant.identity}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
    } finally {
      setIsActionPending(false);
      setShowMenu(false);
    }
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors relative",
        isLocal && "bg-blue-50/30"
      )}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600 shadow-sm">
        {displayName.charAt(0).toUpperCase()}
      </div>

      {/* Name + "You" badge */}
      <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
        <span className="truncate text-sm font-medium text-slate-900">{displayName}</span>
        {isLocal && (
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">(you)</span>
        )}
        {participantIsHost && (
          <Crown className="h-3 w-3 shrink-0 text-[#FBBF24]" aria-label="Host" />
        )}
        {isHandRaised && (
          <Hand className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" aria-label="Hand raised" />
        )}
      </div>

      {/* Media state indicators */}
      <div className="flex items-center gap-2">
        {isMicMuted ? (
          <MicOff className="h-3.5 w-3.5 text-[#DC2626]" aria-label="Microphone muted" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-slate-400" aria-label="Microphone active" />
        )}
        {isCamOff ? (
          <VideoOff className="h-3.5 w-3.5 text-[#DC2626]" aria-label="Camera off" />
        ) : (
          <Video className="h-3.5 w-3.5 text-slate-400" aria-label="Camera on" />
        )}
      </div>

      {/* Host-only actions menu */}
      {isHost && !isLocal && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={isActionPending}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-all"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              {/* Invisible backdrop to close menu */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg overflow-hidden">
                <button
                  onClick={handleMuteParticipant}
                  disabled={isActionPending || isMicMuted}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 text-left font-medium transition-colors"
                >
                  <MicOff className="h-4 w-4" /> Mute Microphone
                </button>
                <button
                  onClick={handleTurnCameraOff}
                  disabled={isActionPending || isCamOff}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 text-left font-medium transition-colors"
                >
                  <VideoOff className="h-4 w-4" /> Turn Camera Off
                </button>
                <div className="my-1 h-px w-full bg-slate-100" />
                <button
                  onClick={() => handleRoleChange("host")}
                  disabled={isActionPending || participantIsHost}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 text-left font-medium transition-colors"
                >
                  <Crown className="h-4 w-4" /> Make Host
                </button>
                <button
                  onClick={() => handleRoleChange("co_host")}
                  disabled={isActionPending}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 text-left font-medium transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" /> Make Co-Host
                </button>
                <div className="my-1 h-px w-full bg-slate-100" />
                <button
                  onClick={handleKickParticipant}
                  disabled={isActionPending}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#DC2626] hover:bg-red-50 text-left transition-colors"
                >
                  <UserX className="h-4 w-4" /> Remove
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
