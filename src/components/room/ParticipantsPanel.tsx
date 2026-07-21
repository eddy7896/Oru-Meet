"use client";

import { useEffect, useState, useCallback } from "react";
import { useParticipants, useLocalParticipant, useDataChannel } from "@livekit/components-react";
import { Participant } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { Mic, MicOff, Video, VideoOff, Crown, X, UserX, Hand, Check, Loader2 } from "lucide-react";
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
          if (data) setWaiting(data as unknown as WaitingParticipant[]);
        });
    }

    fetchWaiting();

    const channel = supabase
      .channel(`waiting:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${roomId}`,
        },
        () => fetchWaiting()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      className="flex w-full md:w-[320px] shrink-0 flex-col border-l border-border bg-[#111827]"
      aria-label="Participants panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Participants
          <span className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-xs font-normal text-text-secondary">
            {participants.length}
          </span>
        </h2>
        <button
          onClick={onClose}
          aria-label="Close participants list"
          className="rounded-lg p-1 text-text-secondary hover:bg-surface-container hover:text-text-primary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Waiting Room */}
      {isHost && waiting.length > 0 && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Waiting in Lobby ({waiting.length})
          </h3>
          <div className="flex flex-col gap-2">
            {waiting.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg bg-surface-container px-3 py-2">
                <span className="text-sm text-text-secondary truncate mr-2">
                  {w.profiles?.full_name || "Guest"}
                </span>
                <button
                  onClick={() => handleAdmit(w.id)}
                  className="flex h-7 items-center gap-1 rounded bg-[#16A34A] px-2 text-xs font-medium text-text-primary hover:bg-[#15803D] transition-colors"
                >
                  <Check className="h-3 w-3" />
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
  // The host is typically the one with roomAdmin permission
  const participantIsHost = participant.permissions?.canPublishSources !== undefined
    ? false
    : false; // Simplified — full role tracking needs metadata
    
  const [isActionPending, setIsActionPending] = useState(false);

  async function handleMuteParticipant() {
    setIsActionPending(true);
    try {
      await fetch(`/api/rooms/${roomCode}/participants/${participant.identity}/mute`, {
        method: "POST",
      });
    } finally {
      setIsActionPending(false);
    }
  }
  
  async function handleKickParticipant() {
    setIsActionPending(true);
    try {
      await fetch(`/api/rooms/${roomCode}/participants/${participant.identity}/kick`, {
        method: "POST",
      });
    } finally {
      setIsActionPending(false);
    }
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors",
        isLocal && "bg-white/[0.03]"
      )}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#374151] text-sm font-semibold text-text-primary">
        {displayName.charAt(0).toUpperCase()}
      </div>

      {/* Name + "You" badge */}
      <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
        <span className="truncate text-sm text-text-secondary">{displayName}</span>
        {isLocal && (
          <span className="shrink-0 text-[10px] text-text-secondary">(you)</span>
        )}
        {participantIsHost && (
          <Crown className="h-3 w-3 shrink-0 text-[#FBBF24]" aria-label="Host" />
        )}
        {isHandRaised && (
          <Hand className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" aria-label="Hand raised" />
        )}
      </div>

      {/* Media state indicators */}
      <div className="flex items-center gap-1.5">
        {isMicMuted ? (
          <MicOff className="h-3.5 w-3.5 text-[#DC2626]" aria-label="Microphone muted" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-text-secondary" aria-label="Microphone active" />
        )}
        {isCamOff ? (
          <VideoOff className="h-3.5 w-3.5 text-[#DC2626]" aria-label="Camera off" />
        ) : (
          <Video className="h-3.5 w-3.5 text-text-secondary" aria-label="Camera on" />
        )}
      </div>

      {/* Host-only actions (shown on hover, hidden for self) */}
      {isHost && !isLocal && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleMuteParticipant}
            disabled={isActionPending || isMicMuted}
            aria-label={`Mute ${displayName}`}
            title={`Mute ${displayName}`}
            className="rounded p-1 text-text-secondary hover:bg-surface-container hover:text-text-primary disabled:opacity-50"
          >
            <MicOff className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleKickParticipant}
            disabled={isActionPending}
            aria-label={`Remove ${displayName}`}
            title={`Remove ${displayName}`}
            className="rounded p-1 text-text-secondary hover:bg-[#DC2626]/20 hover:text-[#DC2626] disabled:opacity-50"
          >
            <UserX className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
