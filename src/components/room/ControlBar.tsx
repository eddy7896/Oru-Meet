"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  useTrackToggle,
  useRoomContext,
  useDataChannel,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import {
  Microphone2,
  MicrophoneSlash,
  Video,
  VideoSlash,
  Monitor,
  MessageText,
  Profile2User,
  CloseCircle,
  Lock,
  Unlock,
  Setting2,
  UserAdd,
  Subtitle
} from "iconsax-react";
import { cn } from "@/lib/utils/cn";
import SettingsModal from "./SettingsModal";
import InviteModal from "./InviteModal";

interface ControlBarProps {
  roomId: string;
  roomCode: string; // The UUID vs short code
  isLocked: boolean;
  role: "host" | "co_host" | "participant";
  activePanel: "chat" | "participants" | "polls" | "whiteboard" | "breakouts" | null;
  onTogglePanel: (panel: "chat" | "participants" | "polls" | "whiteboard" | "breakouts") => void;
}

export default function ControlBar({
  roomId,
  roomCode,
  isLocked,
  role,
  activePanel,
  onTogglePanel,
}: ControlBarProps) {
  const router = useRouter();
  const room = useRoomContext();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Lock room (host) ─────────────────────────────────────────────
  async function toggleLock() {
    setIsLocking(true);
    try {
      await fetch(`/api/rooms/${roomCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_locked: !isLocked }),
      });
    } catch (err) {
      console.error("[ControlBar] Failed to lock room:", err);
    } finally {
      setIsLocking(false);
    }
  }

  // Track toggles
  const { toggle: toggleMic, enabled: micEnabled } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const { toggle: toggleCam, enabled: camEnabled } = useTrackToggle({
    source: Track.Source.Camera,
  });
  const { toggle: toggleScreen, enabled: screenEnabled } = useTrackToggle({
    source: Track.Source.ScreenShare,
  });

  // ── Leave meeting (participant) ──────────────────────────────────
  async function handleLeave() {
    await room.disconnect();
    router.push("/");
  }

  async function handleEndMeeting() {
    setIsEnding(true);
    try {
      await fetch(`/api/rooms/${roomCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ended" }),
      });
    } catch (err) {
      console.error("[ControlBar] Failed to end meeting:", err);
    } finally {
      await room.disconnect();
      router.push("/");
    }
  }

  return (
    <>
      {mounted && createPortal(
        <>
          {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
          {showInvite && <InviteModal roomCode={roomCode} onClose={() => setShowInvite(false)} />}
          
          {/* End Meeting Confirmation Dialog */}
          {showEndConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    End meeting for everyone?
                  </h2>
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <CloseCircle size={20} variant="Linear" />
                  </button>
                </div>
                <p className="mb-6 text-sm text-slate-600">
                  This will disconnect all participants and mark the meeting as
                  ended. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEndMeeting}
                    disabled={isEnding}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                  >
                    {isEnding ? "Ending…" : "End for everyone"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}

      {/* Floating Control Bar */}
      <footer
        className="flex items-center justify-center gap-3 bg-white/90 backdrop-blur-lg border border-slate-200 px-6 py-4 rounded-full shadow-lg"
        role="toolbar"
        aria-label="Meeting controls"
      >
        {/* Camera toggle */}
        <button
          onClick={() => toggleCam()}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-sm",
            camEnabled ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-red-500 text-white hover:bg-red-600"
          )}
        >
          {camEnabled ? <Video size={24} variant="Linear" color="#334155" /> : <VideoSlash size={24} variant="Linear" color="#ffffff" />}
        </button>

        {/* Mic toggle */}
        <button
          onClick={() => toggleMic()}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-sm",
            micEnabled ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-red-500 text-white hover:bg-red-600"
          )}
        >
          {micEnabled ? <Microphone2 size={24} variant="Linear" color="#334155" /> : <MicrophoneSlash size={24} variant="Linear" color="#ffffff" />}
        </button>

        {/* Leave / End meeting */}
        <button
          id="leave-meeting-btn"
          onClick={role === "host" ? () => setShowEndConfirm(true) : handleLeave}
          className="flex h-12 items-center justify-center rounded-full bg-red-500 px-6 text-white font-bold transition-all hover:bg-red-600 shadow-sm mx-2"
        >
          {role === "host" ? "End Meeting" : "Leave Meeting"}
        </button>

        {/* Screen share */}
        <button
          onClick={() => toggleScreen()}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-sm",
            screenEnabled ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          )}
        >
          <Monitor size={24} variant="Linear" color={screenEnabled ? "#ffffff" : "#334155"} />
        </button>

        {/* Closed Captions Placeholder */}
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <Subtitle size={24} variant="Linear" color="#334155" />
        </button>

        {/* Divider */}
        <div className="mx-1 h-8 w-px bg-slate-200" />

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <Setting2 size={24} variant="Linear" color="#334155" />
        </button>
      </footer>
    </>
  );
}
