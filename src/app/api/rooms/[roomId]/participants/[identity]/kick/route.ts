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

  // Next.js 16 context unwrapping
  const { roomId, identity } = await params;

  try {
    const supabase = await createAdminClient();

    // Verify the caller is the host of this room
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
        { error: "Forbidden: Only the host can kick participants" },
        { status: 403 }
      );
    }

    // Initialize LiveKit server client
    const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
    const apiKey = process.env.LIVEKIT_API_KEY || "";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "";

    const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);

    // Remove from LiveKit room
    await roomService.removeParticipant(roomId, identity);

    // Also update the Supabase participants table to mark them as left
    // We need the room UUID for this
    const { data: roomRecord } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", roomId)
      .single();

    if (roomRecord) {
      await supabase
        .from("participants")
        .update({ left_at: new Date().toISOString() })
        .eq("room_id", roomRecord.id)
        .eq("user_id", identity);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Kick API] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
