"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useRoom } from "@/hooks/useRoom";
import { createClient } from "@/lib/supabase/client";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, AlertCircle } from "lucide-react";
import VideoGrid from "./VideoGrid";
import ControlBar from "./ControlBar";
import ChatPanel from "./ChatPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import PollsPanel from "./PollsPanel";
import WhiteboardPanel from "./WhiteboardPanel";
import BreakoutPanel from "./BreakoutPanel";

interface RoomClientProps {
  roomId: string;
  role: "host" | "co_host" | "participant";
  initialCamEnabled: boolean;
  initialMicEnabled: boolean;
}

type PanelType = "chat" | "participants" | "polls" | "whiteboard" | "breakouts" | null;

export default function RoomClient({
  roomId,
  role,
  initialCamEnabled,
  initialMicEnabled,
}: RoomClientProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { room, isLoading: isLoadingRoom, error: roomError } = useRoom(roomId);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  // ── Redirect if ended ──────────────────────────────────────────────
  useEffect(() => {
    if (room?.status === "ended") {
      router.push(`/room/${roomId}/ended`);
    }
  }, [room?.status, roomId, router]);

  // ── Redirect to Breakout Room ──────────────────────────────────────
  useEffect(() => {
    async function checkBreakout() {
      if (!isLoaded || !user || !room) return;
      const settings = room.settings as Record<string, unknown> | null;
      if (settings?.breakouts_active) {
        const supabase = createClient();
        const { data: assignments } = await supabase
          .from("breakout_assignments")
          .select("breakout_room_id, breakout_rooms(livekit_room)")
          .eq("user_id", user.id);
        
        if (assignments && assignments.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const br = assignments[0].breakout_rooms as any;
          if (br?.livekit_room) {
            // Unmount/disconnect from this room, navigate to new room
            router.push(`/room/${br.livekit_room}?role=${role}`);
          }
        }
      }
    }
    checkBreakout();
  }, [room?.settings, isLoaded, user, room, router, role]);

  // Fetch LiveKit access token
  useEffect(() => {
    if (!isLoaded || !user) return;

    const participantName =
      user.fullName ?? user.primaryEmailAddress?.emailAddress ?? user.id;

    fetch("/api/livekit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName: roomId,
        participantName,
        role,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to get access token");
        }
        return res.json();
      })
      .then(({ token }) => {
        setToken(token);
        setIsLoadingToken(false);
      })
      .catch((err: Error) => {
        setTokenError(err.message);
        setIsLoadingToken(false);
      });
  }, [isLoaded, user, roomId, role]);

  // ── Loading state ──────────────────────────────────────────────────
  if (!isLoaded || isLoadingRoom || isLoadingToken) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        <p className="text-sm text-white/50">Connecting to room…</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────
  if (roomError || tokenError || !serverUrl || !room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DC2626]/20">
          <AlertCircle className="h-7 w-7 text-[#DC2626]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-white">Failed to connect</p>
          <p className="text-xs text-white/50">
            {roomError ?? tokenError ?? "LiveKit server URL is not configured."}
          </p>
        </div>
      </div>
    );
  }

  // ── Connected — render the room ────────────────────────────────────
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={initialMicEnabled}
      video={initialCamEnabled}
      className="flex flex-1 flex-col overflow-hidden"
      onDisconnected={() => router.push("/")}
      onError={(error) => console.error("[LiveKitRoom] Error:", error)}
    >
      <RoomAudioRenderer />

      {/* Main content area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Video grid — takes remaining space */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <VideoGrid />
        </div>

        {/* Side panel — Responsive Modal on Mobile, Sidebar on Desktop */}
        {activePanel && (
          <div className="absolute inset-0 z-50 flex justify-end bg-black/60 md:static md:inset-auto md:z-auto md:bg-transparent">
            {activePanel === "chat" && (
              <ChatPanel
                roomId={room.id}
                onClose={() => setActivePanel(null)}
              />
            )}
            {activePanel === "participants" && (
              <ParticipantsPanel
                roomId={room.id}
                roomCode={roomId}
                isHost={role === "host"}
                onClose={() => setActivePanel(null)}
              />
            )}
            {activePanel === "polls" && (
              <PollsPanel
                roomId={room.id}
                roomCode={roomId}
                isHost={role === "host"}
                onClose={() => setActivePanel(null)}
              />
            )}
            {activePanel === "whiteboard" && (
              <WhiteboardPanel
                onClose={() => setActivePanel(null)}
              />
            )}
            {activePanel === "breakouts" && role === "host" && (
              <BreakoutPanel
                roomId={room.id}
                roomCode={roomId}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Control bar — pinned to bottom */}
      <ControlBar
        roomId={room.id}
        roomCode={roomId}
        isLocked={room.is_locked || false}
        role={role}
        activePanel={activePanel}
        onTogglePanel={(panel) =>
          setActivePanel((prev) => (prev === panel ? null : panel))
        }
      />
    </LiveKitRoom>
  );
}
