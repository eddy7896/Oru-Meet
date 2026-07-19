import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { RoomServiceClient, TrackType } from "livekit-server-sdk";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; identity: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId, identity } = await params;

  try {
    const supabase = await createAdminClient();

    // Verify the caller is the host
    const { data: room } = await supabase
      .from("rooms")
      .select("host_id")
      .eq("code", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.host_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Only the host can mute participants" },
        { status: 403 }
      );
    }

    // Initialize LiveKit server client
    const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
    const apiKey = process.env.LIVEKIT_API_KEY || "";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "";

    const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);

    // Get the participant info to find their audio tracks
    const participant = await roomService.getParticipant(roomId, identity);
    
    let mutedCount = 0;
    for (const track of participant.tracks) {
      if (track.type === TrackType.AUDIO) {
        await roomService.mutePublishedTrack(roomId, identity, track.sid, true);
        mutedCount++;
      }
    }

    return NextResponse.json({ success: true, mutedCount });
  } catch (err) {
    console.error("[Mute API] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
