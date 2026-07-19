import { currentUser } from "@clerk/nextjs/server";
import { Video } from "lucide-react";
import LobbyClient from "@/components/lobby/LobbyClient";

interface LobbyPageProps {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ role?: string }>;
}

export default async function LobbyPage({ params, searchParams }: LobbyPageProps) {
  // Next.js 16: params and searchParams are Promises — must be awaited
  const { roomId } = await params;
  const { role } = await searchParams;

  const user = await currentUser();
  const participantName = user?.fullName ?? user?.firstName ?? "Guest";
  const participantRole = role === "host" ? "host" : "participant";

  return (
    <div className="flex min-h-dvh flex-col bg-[#F9FAFB]">
      {/* Header */}
      <header className="flex items-center gap-2.5 border-b border-[#F3F4F6] bg-white px-8 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A73E8]">
          <Video className="h-4 w-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-[#111827]">
          oru-meet
        </span>
      </header>

      {/* Lobby content — client component for camera/mic access */}
      <LobbyClient
        roomId={roomId}
        participantName={participantName}
        role={participantRole as "host" | "participant"}
      />
    </div>
  );
}
