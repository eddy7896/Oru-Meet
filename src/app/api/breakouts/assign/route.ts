import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const postSchema = z.object({
  roomCode: z.string(), // Parent room code
  participantId: z.string(),
  breakoutRoomId: z.string().uuid().nullable(),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error }, { status: 400 });
  }

  const { roomCode, participantId, breakoutRoomId } = parsed.data;

  try {
    const supabase = await createAdminClient();

    // Verify parent room exists and caller is host
    const { data: parentRoom } = await supabase
      .from("rooms")
      .select("id, host_id")
      .eq("code", roomCode)
      .single();

    if (!parentRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (parentRoom.host_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Only the host can assign breakout rooms" },
        { status: 403 }
      );
    }

    // First, find all breakout rooms for this parent room to delete existing assignments
    const { data: breakoutRooms } = await supabase
      .from("breakout_rooms")
      .select("id")
      .eq("room_id", parentRoom.id);

    if (breakoutRooms && breakoutRooms.length > 0) {
      const breakoutIds = breakoutRooms.map((br) => br.id);
      
      // Delete any existing assignments for this user in these breakout rooms
      await supabase
        .from("breakout_assignments")
        .delete()
        .in("breakout_room_id", breakoutIds)
        .eq("user_id", participantId);
    }

    // If assigning to a new room, insert it
    if (breakoutRoomId) {
      // Verify the breakout room belongs to this parent
      const isValid = breakoutRooms?.some(br => br.id === breakoutRoomId);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid breakout room" }, { status: 400 });
      }

      await supabase
        .from("breakout_assignments")
        .insert({
          breakout_room_id: breakoutRoomId,
          user_id: participantId,
        });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/breakouts/assign] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
