import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const postSchema = z.object({
  roomCode: z.string(), // Parent room code
  name: z.string().min(1).max(100),
});

function generateBreakoutCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const p = () =>
    Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
  return `brk-${p()}-${p()}`;
}

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

  const { roomCode, name } = parsed.data;

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
        { error: "Forbidden: Only the host can create breakout rooms" },
        { status: 403 }
      );
    }

    // Generate a new code for the breakout room
    const breakoutCode = generateBreakoutCode();

    // Create the room in the `rooms` table so it acts like a normal room
    const { data: newRoom, error: roomError } = await supabase
      .from("rooms")
      .insert({
        code: breakoutCode,
        host_id: userId,
        title: `${name} (Breakout)`,
        status: "active", // breakouts are immediately active
      })
      .select("id")
      .single();

    if (roomError || !newRoom) {
      throw roomError;
    }

    // Link it in `breakout_rooms`
    const { data: breakoutRoom, error: breakoutError } = await supabase
      .from("breakout_rooms")
      .insert({
        room_id: parentRoom.id,
        name,
        livekit_room: breakoutCode,
      })
      .select()
      .single();

    if (breakoutError) throw breakoutError;

    return NextResponse.json({ breakoutRoom }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/breakouts] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
