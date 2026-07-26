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
    <RoomClient
      roomId={roomId}
      role={role}
      initialCamEnabled={initialCamEnabled}
      initialMicEnabled={initialMicEnabled}
    />
  );
}


