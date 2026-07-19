import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const postSchema = z.object({
  pollId: z.string().uuid(),
  optionId: z.string(),
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

  const { pollId, optionId } = parsed.data;

  try {
    const supabase = await createAdminClient();

    // Check if poll is active
    const { data: poll } = await supabase
      .from("polls")
      .select("is_active")
      .eq("id", pollId)
      .single();

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (!poll.is_active) {
      return NextResponse.json({ error: "Poll is closed" }, { status: 400 });
    }

    // Insert vote (unique constraint on poll_id + user_id will prevent double voting)
    const { error } = await supabase
      .from("poll_responses")
      .insert({
        poll_id: pollId,
        user_id: userId,
        option_id: optionId,
      });

    if (error) {
      if (error.code === "23505") { // unique_violation
        return NextResponse.json({ error: "You have already voted" }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/polls/vote] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
