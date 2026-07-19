import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

const patchSchema = z.object({
  status: z.enum(["waiting", "active", "ended"]).optional(),
  is_locked: z.boolean().optional(),
  title: z.string().max(200).optional(),
});

// GET /api/rooms/[roomId] — fetch room by code
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;

  try {
    const supabase = await createAdminClient();

    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", roomId)
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (err) {
    console.error("[GET /api/rooms/[roomId]] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/rooms/[roomId] — update room status or settings (host only)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const supabase = await createAdminClient();

    // Verify the caller is the host before allowing updates
    const { data: existing } = await supabase
      .from("rooms")
      .select("host_id, status")
      .eq("code", roomId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (existing.host_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden — only the host can update the room" },
        { status: 403 }
      );
    }

    // Build the update payload with automatic timestamp management
    const updatePayload: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.status === "active" && existing.status === "waiting") {
      updatePayload.started_at = new Date().toISOString();
    }

    if (parsed.data.status === "ended") {
      updatePayload.ended_at = new Date().toISOString();
    }

    const { data: room, error } = await supabase
      .from("rooms")
      .update(updatePayload)
      .eq("code", roomId)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/rooms/[roomId]] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
    }

    return NextResponse.json({ room });
  } catch (err) {
    console.error("[PATCH /api/rooms/[roomId]] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
