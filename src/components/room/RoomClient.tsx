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
import { cn } from "@/lib/utils/cn";

interface RoomClientProps {
  roomId: string;
  role: "host" | "co_host" | "participant";
  initialCamEnabled: boolean;
  initialMicEnabled: boolean;
}

type PanelType = "chat" | "participants" | "polls" | "whiteboard" | "breakouts" | null;

import { MessageText, Profile2User, Chart, Edit, Category } from "iconsax-react";

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
  const [activePanel, setActivePanel] = useState<PanelType>("chat");

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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#FAFAFA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A73E8]" />
        <p className="text-sm text-slate-500 font-medium">Connecting to room…</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────
  if (roomError || tokenError || !serverUrl || !room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 bg-[#FAFAFA]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DC2626]/10">
          <AlertCircle className="h-7 w-7 text-[#DC2626]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-900">Failed to connect</p>
          <p className="text-xs text-slate-500">
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
      video={initialCamEnabled}
      className="flex h-dvh w-full bg-[#FAFAFA] overflow-hidden"
      onDisconnected={() => router.push("/")}
      onError={(error) => console.error("[LiveKitRoom] Error:", error)}
    >
      <RoomAudioRenderer />

      {/* 1. Left Sidebar Navigation */}
      <aside className="hidden md:flex w-20 shrink-0 flex-col items-center py-8 bg-[#FAFAFA] border-r border-[#E5E7EB]">
        {/* Logo/Brand Icon */}
        <div className="text-[#1A73E8] mb-12">
          <Profile2User size={32} variant="Bold" color="#1A73E8" />
        </div>

        {/* Nav Items */}
        <div className="flex flex-col gap-8 flex-1 w-full items-center">
          {/* Participants */}
          <button 
            className={cn("relative w-full flex justify-center transition-colors", activePanel === "participants" ? "text-[#1A73E8]" : "text-[#9CA3AF] hover:text-[#1A73E8]")}
            onClick={() => setActivePanel(activePanel === "participants" ? null : "participants")}
            title="Participants"
          >
            <Profile2User size={24} variant="Bold" color="currentColor" />
            {activePanel === "participants" && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1A73E8] rounded-l-md" />}
          </button>

          {/* Chat */}
          <button 
            className={cn("relative w-full flex justify-center transition-colors", activePanel === "chat" ? "text-[#1A73E8]" : "text-[#9CA3AF] hover:text-[#1A73E8]")}
            onClick={() => setActivePanel(activePanel === "chat" ? null : "chat")}
            title="Chat"
          >
            <MessageText size={24} variant="Bold" color="currentColor" />
            {activePanel === "chat" && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1A73E8] rounded-l-md" />}
            {activePanel !== "chat" && <div className="absolute ml-3 -top-1 w-2.5 h-2.5 bg-[#DC2626] rounded-full border-2 border-[#FAFAFA]" />}
          </button>

          {/* Polls */}
          <button 
            className={cn("relative w-full flex justify-center transition-colors", activePanel === "polls" ? "text-[#1A73E8]" : "text-[#9CA3AF] hover:text-[#1A73E8]")}
            onClick={() => setActivePanel(activePanel === "polls" ? null : "polls")}
            title="Polls"
          >
            <Chart size={24} variant="Bold" color="currentColor" />
            {activePanel === "polls" && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1A73E8] rounded-l-md" />}
          </button>

          {/* Whiteboard */}
          <button 
            className={cn("relative w-full flex justify-center transition-colors", activePanel === "whiteboard" ? "text-[#1A73E8]" : "text-[#9CA3AF] hover:text-[#1A73E8]")}
            onClick={() => setActivePanel(activePanel === "whiteboard" ? null : "whiteboard")}
            title="Whiteboard"
          >
            <Edit size={24} variant="Bold" color="currentColor" />
            {activePanel === "whiteboard" && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1A73E8] rounded-l-md" />}
          </button>

          {/* Breakouts (Host only) */}
          {role === "host" && (
            <button 
              className={cn("relative w-full flex justify-center transition-colors", activePanel === "breakouts" ? "text-[#1A73E8]" : "text-[#9CA3AF] hover:text-[#1A73E8]")}
              onClick={() => setActivePanel(activePanel === "breakouts" ? null : "breakouts")}
              title="Breakout Rooms"
            >
              <Category size={24} variant="Bold" color="currentColor" />
              {activePanel === "breakouts" && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1A73E8] rounded-l-md" />}
            </button>
          )}
        </div>

        {/* User Avatar */}
        <div className="mt-auto">
          {user?.imageUrl ? (
            <img src={user.imageUrl} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="User" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
              {user?.firstName?.[0] || 'U'}
            </div>
          )}
        </div>
      </aside>

      {/* 2. Center Content (Main Stage) */}
      <main className="flex-1 flex flex-col p-0 md:p-6 relative overflow-hidden bg-black md:bg-transparent">
        <div className="flex-1 bg-white md:rounded-[2rem] shadow-sm md:border border-[#E5E7EB] flex flex-col overflow-hidden relative p-4 pb-28 md:p-6 md:pb-6">
          
          {/* Header */}
          <div className="flex justify-between items-start md:items-center mb-4 px-2 flex-col md:flex-row gap-4">
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {room.title || "Meeting"}
              </h1>
              <div className="flex items-center gap-4 mt-1.5 text-sm font-medium text-slate-500">
                <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2 py-0.5 rounded-md">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold tracking-wider uppercase">Recording</span>
                </div>
              </div>
            </div>
            <button className="px-5 py-2.5 rounded-full border-2 border-[#1A73E8]/20 text-[#1A73E8] font-bold text-[13px] hover:bg-[#F0F4FE] transition-colors">
              Share meeting link
            </button>
          </div>

          {/* Video Grid */}
          <div className="flex-1 relative overflow-hidden rounded-[1.5rem] min-h-0 min-w-0">
            <VideoGrid />
          </div>

          {/* Control Bar (Handles its own positioning) */}
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
        </div>
      </main>

      {/* 3. Right Sidebar (Chat & Panels) */}
      {activePanel && (
        <aside className="w-full md:w-80 lg:w-96 shrink-0 bg-[#FAFAFA] border-l border-[#E5E7EB] flex flex-col z-30 absolute lg:static inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 shadow-2xl lg:shadow-none">
          {activePanel === "chat" && (
            <ChatPanel roomId={room.id} onClose={() => setActivePanel(null)} />
          )}
          {activePanel === "participants" && (
            <ParticipantsPanel roomId={room.id} roomCode={roomId} isHost={role === "host"} onClose={() => setActivePanel(null)} />
          )}
          {activePanel === "polls" && (
            <PollsPanel roomId={room.id} roomCode={roomId} isHost={role === "host"} onClose={() => setActivePanel(null)} />
          )}
          {activePanel === "whiteboard" && (
            <WhiteboardPanel roomId={room.id} onClose={() => setActivePanel(null)} />
          )}
          {activePanel === "breakouts" && role === "host" && (
            <BreakoutPanel roomId={room.id} roomCode={roomId} onClose={() => setActivePanel(null)} />
          )}
        </aside>
      )}

    </LiveKitRoom>
  );
}
