"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useRoom } from "@/hooks/useRoom";
import { createClient } from "@/lib/supabase/client";
import {
  Mic, MicOff, Video, VideoOff,
  Loader2, AlertCircle, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface LobbyClientProps {
  roomId: string;
  participantName: string;
  role: "host" | "participant";
}

type PermissionState = "idle" | "requesting" | "granted" | "denied" | "no-device";

export default function LobbyClient({
  roomId,
  participantName,
  role,
}: LobbyClientProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camState, setCamState] = useState<PermissionState>("idle");
  const [micState, setMicState] = useState<PermissionState>("idle");
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { user } = useUser();
  const { room, isLoading: isLoadingRoom } = useRoom(roomId);
  const [isWaiting, setIsWaiting] = useState(false);
  const supabase = createClient();

  const meetingLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  // -- Request camera + mic on mount ----------------------------------
  useEffect(() => {
    let active = true;
    setCamState("requesting");
    setMicState("requesting");

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamState("granted");
        setMicState("granted");
      })
      .catch((err: DOMException | Error) => {
        if (!active) return;
        const name = (err as DOMException).name;
        if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setCamState("no-device");
          setMicState("no-device");
        } else {
          setCamState("denied");
          setMicState("denied");
        }
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // -- Toggle tracks ---------------------------------------------------
  function toggleCamera() {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCamEnabled((v) => !v);
  }

  function toggleMic() {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicEnabled((v) => !v);
  }

  // -- Copy link -------------------------------------------------------
  async function copyLink() {
    await navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // -- Join room -------------------------------------------------------
  async function joinRoom() {
    startTransition(async () => {
      if (room?.is_locked && role !== "host") {
        setIsWaiting(true);
        try {
          await fetch("/api/participants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: room.id, role }),
          });
        } catch (err) {
          console.error("Failed to request access", err);
          setIsWaiting(false);
        }
      } else {
        router.push(`/room/${roomId}?cam=${camEnabled}&mic=${micEnabled}&role=${role}`);
      }
    });
  }

  // Listen for admission if waiting
  useEffect(() => {
    if (!isWaiting || !room || !user) return;
    
    const channel = supabase
      .channel(`wait:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.new.user_id === user.id && payload.new.is_admitted) {
            router.push(`/room/${roomId}?cam=${camEnabled}&mic=${micEnabled}&role=${role}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isWaiting, room, user, router, roomId, camEnabled, micEnabled, role, supabase]);

  const isLoading = camState === "requesting";
  const hasError = camState === "denied" || camState === "no-device";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="grid gap-8 md:grid-cols-[1fr_320px]">

          {/* -- Camera Preview -------------------------------------- */}
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#111827]">
              {/* Video feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "h-full w-full object-cover transition-opacity duration-300",
                  (!camEnabled || hasError) && "opacity-0"
                )}
              />

              {/* Camera off overlay */}
              {(!camEnabled || hasError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#374151]">
                    <span className="text-2xl font-semibold text-white">
                      {participantName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {hasError && (
                    <p className="text-xs text-[#9CA3AF]">
                      {camState === "no-device"
                        ? "No camera detected"
                        : "Camera access blocked"}
                    </p>
                  )}
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                </div>
              )}

              {/* Name badge */}
              <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {participantName}
              </div>

              {/* Controls overlay */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={toggleMic}
                  disabled={micState !== "granted"}
                  aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150",
                    micEnabled
                      ? "bg-black/50 text-white hover:bg-black/70"
                      : "bg-[#DC2626] text-white hover:bg-[#B91C1C]",
                    "disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm"
                  )}
                >
                  {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>

                <button
                  onClick={toggleCamera}
                  disabled={camState !== "granted"}
                  aria-label={camEnabled ? "Turn off camera" : "Turn on camera"}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150",
                    camEnabled
                      ? "bg-black/50 text-white hover:bg-black/70"
                      : "bg-[#DC2626] text-white hover:bg-[#B91C1C]",
                    "disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm"
                  )}
                >
                  {camEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Permission error banner */}
            {hasError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-[#DC2626]">
                    {camState === "no-device"
                      ? "No camera or microphone detected"
                      : "Camera and microphone access blocked"}
                  </p>
                  <p className="text-xs text-[#B91C1C]">
                    {camState === "denied"
                      ? "Please allow access in your browser settings, then refresh the page."
                      : "You can still join and listen — you won't be able to speak or show video."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* -- Right Panel ----------------------------------------- */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-[#111827]">
                Ready to join?
              </h1>
              <p className="text-sm text-[#6B7280]">
                {role === "host"
                  ? "You're starting this meeting as host."
                  : "Check your camera and mic, then join."}
              </p>
            </div>

            {/* Meeting code display */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                Meeting code
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <span className="flex-1 font-mono text-sm font-semibold tracking-widest text-[#111827]">
                  {roomId}
                </span>
                <button
                  onClick={copyLink}
                  aria-label="Copy meeting link"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-[#E5E7EB] hover:text-[#111827]"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Join button */}
            <button
              id="lobby-join-btn"
              onClick={joinRoom}
              disabled={isPending || isLoadingRoom || isWaiting}
              className={cn(
                "flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed",
                isWaiting 
                  ? "bg-[#374151] opacity-100" 
                  : "bg-[#1A73E8] hover:bg-[#1557B0] hover:shadow-md disabled:opacity-60"
              )}
              aria-label="Join the meeting"
            >
              {isWaiting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for host to let you in…
                </>
              ) : isPending || isLoadingRoom ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isLoadingRoom ? "Loading room…" : "Joining…"}
                </>
              ) : room?.is_locked && role !== "host" ? (
                "Ask to Join"
              ) : (
                "Join Now"
              )}
            </button>

            <p className="text-center text-xs text-[#9CA3AF]">
              {role === "host"
                ? "Others will wait until you admit them."
                : room?.is_locked 
                ? "This room is locked. The host must admit you."
                : "You may wait if the host hasn't started yet."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
