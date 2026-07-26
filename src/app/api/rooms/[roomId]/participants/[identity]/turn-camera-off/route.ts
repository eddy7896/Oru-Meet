import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { RoomServiceClient } from "livekit-server-sdk";

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

    // Verify caller is the host of this room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("host_id")
      .eq("code", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.host_id !== userId) {
      return NextResponse.json({ error: "Forbidden: Only hosts can turn off cameras" }, { status: 403 });
    }

    const liveKitUrl = process.env.LIVEKIT_API_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!liveKitUrl || !apiKey || !apiSecret) {
      throw new Error("LiveKit credentials not configured");
    }

    const roomService = new RoomServiceClient(liveKitUrl, apiKey, apiSecret);
    
    // Get participant to find their video track
    const participant = await roomService.getParticipant(roomId, identity);
    const videoTrack = participant.tracks.find(t => t.type === 1); // 1 = video (TrackType.VIDEO)

    if (videoTrack) {
      await roomService.mutePublishedTrack(roomId, identity, videoTrack.sid, true);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST turn-camera-off] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
