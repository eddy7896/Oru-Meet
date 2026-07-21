"use client";

import { useState } from "react";
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
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorStop,
  MessageSquare,
  Users,
  PhoneOff,
  X,
  Lock,
  Unlock,
  Hand,
  BarChart2,
  Pencil,
  LayoutGrid,
  Settings,
  UserPlus,
} from "lucide-react";
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

/**
 * ControlBar — Google Meet-style toolbar centered at the bottom of the room.
 * Uses LiveKit's useTrackToggle for mic, camera, and screen share.
 * Host sees an "End Meeting" option; participants see "Leave Meeting" only.
 */
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
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Data channel for hand raising
  const { send } = useDataChannel("hand_raise");

  function toggleHandRaise() {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    const payload = JSON.stringify({ type: "HAND_RAISE", isRaised: newState });
    const encoder = new TextEncoder();
    send(encoder.encode(payload), { reliable: true });
  }

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

  // Track toggles — useTrackToggle returns { toggle, enabled, pending }
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
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showInvite && <InviteModal roomCode={roomCode} onClose={() => setShowInvite(false)} />}

      {/* End Meeting Confirmation Dialog */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#374151] bg-[#1F2937] p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                End meeting for everyone?
              </h2>
              <button
                onClick={() => setShowEndConfirm(false)}
                aria-label="Cancel"
                className="rounded-lg p-1 text-text-secondary hover:bg-surface-container hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-6 text-sm text-text-secondary">
              This will disconnect all participants and mark the meeting as
              ended. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-xl border border-[#374151] py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                onClick={handleEndMeeting}
                disabled={isEnding}
                className="flex-1 rounded-xl bg-[#DC2626] py-2.5 text-sm font-semibold text-text-primary hover:bg-[#B91C1C] disabled:opacity-60"
              >
                {isEnding ? "Ending…" : "End for everyone"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <footer
        className="flex items-center justify-center gap-2 border-t border-border px-6 py-3 bg-surface"
        role="toolbar"
        aria-label="Meeting controls"
      >
        {/* Mic toggle */}
        <IconButton
          onClick={() => toggleMic()}
          active={micEnabled}
          activeLabel="Mute microphone"
          inactiveLabel="Unmute microphone"
          activeIcon={<Mic className="h-5 w-5" />}
          inactiveIcon={<MicOff className="h-5 w-5" />}
          danger={!micEnabled}
        />

        {/* Camera toggle */}
        <IconButton
          onClick={() => toggleCam()}
          active={camEnabled}
          activeLabel="Turn off camera"
          inactiveLabel="Turn on camera"
          activeIcon={<Video className="h-5 w-5" />}
          inactiveIcon={<VideoOff className="h-5 w-5" />}
          danger={!camEnabled}
        />

        {/* Screen share */}
        <IconButton
          onClick={() => toggleScreen()}
          active={screenEnabled}
          activeLabel="Stop screen sharing"
          inactiveLabel="Share screen"
          activeIcon={<MonitorStop className="h-5 w-5" />}
          inactiveIcon={<MonitorUp className="h-5 w-5" />}
          highlight={screenEnabled}
        />

        {/* Hand Raise */}
        <IconButton
          onClick={toggleHandRaise}
          active={isHandRaised}
          activeLabel="Lower hand"
          inactiveLabel="Raise hand"
          activeIcon={<Hand className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
          inactiveIcon={<Hand className="h-5 w-5" />}
          highlight={isHandRaised}
        />

        {/* Settings */}
        <IconButton
          onClick={() => setShowSettings(true)}
          active={false}
          activeLabel="Settings"
          inactiveLabel="Settings"
          activeIcon={<Settings className="h-5 w-5" />}
          inactiveIcon={<Settings className="h-5 w-5" />}
        />

        {/* Invite */}
        <IconButton
          onClick={() => setShowInvite(true)}
          active={false}
          activeLabel="Invite people"
          inactiveLabel="Invite people"
          activeIcon={<UserPlus className="h-5 w-5" />}
          inactiveIcon={<UserPlus className="h-5 w-5" />}
        />

        {/* Divider */}
        <div className="mx-1 h-8 w-px bg-border" />

        {/* Chat panel toggle */}
        <IconButton
          onClick={() => onTogglePanel("chat")}
          active={activePanel === "chat"}
          activeLabel="Close chat"
          inactiveLabel="Open chat"
          activeIcon={<MessageSquare className="h-5 w-5" />}
          inactiveIcon={<MessageSquare className="h-5 w-5" />}
          highlight={activePanel === "chat"}
        />

        {/* Participants panel toggle */}
        <IconButton
          onClick={() => onTogglePanel("participants")}
          active={activePanel === "participants"}
          activeLabel="Close participants list"
          inactiveLabel="Show participants"
          activeIcon={<Users className="h-5 w-5" />}
          inactiveIcon={<Users className="h-5 w-5" />}
          highlight={activePanel === "participants"}
        />

        {/* Polls panel toggle */}
        <IconButton
          onClick={() => onTogglePanel("polls")}
          active={activePanel === "polls"}
          activeLabel="Close polls"
          inactiveLabel="Open polls"
          activeIcon={<BarChart2 className="h-5 w-5" />}
          inactiveIcon={<BarChart2 className="h-5 w-5" />}
          highlight={activePanel === "polls"}
        />

        {/* Whiteboard panel toggle */}
        <IconButton
          onClick={() => onTogglePanel("whiteboard")}
          active={activePanel === "whiteboard"}
          activeLabel="Close whiteboard"
          inactiveLabel="Open whiteboard"
          activeIcon={<Pencil className="h-5 w-5" />}
          inactiveIcon={<Pencil className="h-5 w-5" />}
          highlight={activePanel === "whiteboard"}
        />

        {/* Breakouts panel toggle (Host Only) */}
        {role === "host" && (
          <IconButton
            onClick={() => onTogglePanel("breakouts")}
            active={activePanel === "breakouts"}
            activeLabel="Close breakout rooms"
            inactiveLabel="Manage breakout rooms"
            activeIcon={<LayoutGrid className="h-5 w-5" />}
            inactiveIcon={<LayoutGrid className="h-5 w-5" />}
            highlight={activePanel === "breakouts"}
          />
        )}

        {/* Divider */}
        <div className="mx-1 h-8 w-px bg-border" />

        {/* Host controls (Lock) */}
        {role === "host" && (
          <IconButton
            onClick={toggleLock}
            active={isLocked}
            activeLabel="Unlock room"
            inactiveLabel="Lock room"
            activeIcon={<Lock className="h-5 w-5 text-yellow-500" />}
            inactiveIcon={<Unlock className="h-5 w-5" />}
          />
        )}

        {/* Leave / End meeting */}
        <div className="flex shrink-0">
          {role === "host" ? (
            <Button
              id="end-meeting-btn"
              variant="danger"
              onClick={() => setShowEndConfirm(true)}
              aria-label="End meeting for everyone"
              icon={<PhoneOff className="h-4 w-4" />}
            >
              End
            </Button>
          ) : (
            <Button
              id="leave-meeting-btn"
              variant="danger"
              onClick={handleLeave}
              aria-label="Leave meeting"
              icon={<PhoneOff className="h-4 w-4" />}
            >
              Leave
            </Button>
          )}
        </div>
      </footer>
    </>
  );
}
