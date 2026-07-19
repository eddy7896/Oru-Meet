import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const postSchema = z.object({
  roomId: z.string().uuid(),
  role: z.enum(["host", "co_host", "participant"]).default("participant"),
});

const patchSchema = z.object({
  participantId: z.string().uuid(),
  is_admitted: z.boolean().optional(),
});

// POST /api/participants — Request to join a room (used in Lobby for locked rooms)
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { roomId, role } = parsed.data;

  try {
    const supabase = await createAdminClient();

    // Just In Time profile upsert
    const user = await currentUser();
    if (user) {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: user.fullName || user.firstName || "Unknown",
        email: user.primaryEmailAddress?.emailAddress,
        avatar_url: user.imageUrl,
      });
    }

    // Upsert the participant record (is_admitted defaults to FALSE)
    const { data: participant, error } = await supabase
      .from("participants")
      .upsert(
        {
          room_id: roomId,
          user_id: userId,
          role,
          is_admitted: false,
        },
        { onConflict: "room_id,user_id" } // Need to make sure there's a unique constraint in the DB, or just use insert if we manually check
      )
      .select()
      .single();

    if (error) {
      // If upsert fails because of no unique constraint, fallback to a check-then-insert
      const { data: existing } = await supabase
        .from("participants")
        .select("*")
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .single();
        
      if (existing) {
        return NextResponse.json({ participant: existing });
      }

      const { data: newParticipant, error: insertError } = await supabase
        .from("participants")
        .insert({ room_id: roomId, user_id: userId, role, is_admitted: false })
        .select()
        .single();
        
      if (insertError) throw insertError;
      return NextResponse.json({ participant: newParticipant }, { status: 201 });
    }

    return NextResponse.json({ participant }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/participants] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/participants — Admit a participant (Host only)
export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { participantId, is_admitted } = parsed.data;

  try {
    const supabase = await createAdminClient();

    // Check if the caller is the host of the room
    const { data: participantToUpdate } = await supabase
      .from("participants")
      .select("room_id")
      .eq("id", participantId)
      .single();

    if (!participantToUpdate) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

    const { data: room } = await supabase
      .from("rooms")
      .select("host_id")
      .eq("id", participantToUpdate.room_id)
      .single();

    if (room?.host_id !== userId) {
      return NextResponse.json({ error: "Forbidden - not the host" }, { status: 403 });
    }

    const { data: updated, error } = await supabase
      .from("participants")
      .update({ is_admitted })
      .eq("id", participantId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ participant: updated });
  } catch (err) {
    console.error("[PATCH /api/participants] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
