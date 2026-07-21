import { Video } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import RoomClient from "@/components/room/RoomClient";
import CopyCodeButton from "@/components/room/CopyCodeButton";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ cam?: string; mic?: string; role?: string }>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  // Next.js 16: params and searchParams are Promises — must be awaited
  const { roomId } = await params;
  const { role: roleParam, cam, mic } = await searchParams;

  const role =
    roleParam === "host" || roleParam === "co_host"
      ? (roleParam as "host" | "co_host")
      : "participant";

  const initialCamEnabled = cam !== "false";
  const initialMicEnabled = mic !== "false";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-text-primary">
      {/* ── Room header ─────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Video className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-text-primary">oru-meet</span>
        </div>

        {/* Meeting code badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5">
            <span className="font-mono text-xs font-medium tracking-widest text-text-secondary">
              {roomId}
            </span>
            <CopyCodeButton code={roomId} />
          </div>
        </div>

        {/* User avatar */}
        <UserButton />
      </header>

      {/* ── Room body — LiveKit room ─────────────────────────────────── */}
      <RoomClient
        roomId={roomId}
        role={role}
        initialCamEnabled={initialCamEnabled}
        initialMicEnabled={initialMicEnabled}
      />
    </div>
  );
}


