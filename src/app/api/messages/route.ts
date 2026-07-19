import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const postSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(2000),
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { roomId, content } = parsed.data;

  try {
    const supabase = await createAdminClient();

    // Verify user is in the room
    const { data: participant } = await supabase
      .from("participants")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "Forbidden — not a participant in this room" },
        { status: 403 }
      );
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        sender_id: userId,
        content,
      })
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error("[POST /api/messages] Supabase error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/messages] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
