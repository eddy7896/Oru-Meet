import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const postSchema = z.object({
  roomCode: z.string(),
  question: z.string().min(1).max(500),
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2).max(10),
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

  const { roomCode, question, options } = parsed.data;

  try {
    const supabase = await createAdminClient();

    const { data: room } = await supabase
      .from("rooms")
      .select("id, host_id")
      .eq("code", roomCode)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.host_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Only the host can create polls" },
        { status: 403 }
      );
    }

    const { data: poll, error } = await supabase
      .from("polls")
      .insert({
        room_id: room.id,
        question,
        options,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ poll }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/polls] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
