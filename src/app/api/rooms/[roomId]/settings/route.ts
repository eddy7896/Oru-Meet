import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  breakouts_active: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next.js 16: params must be awaited
  const { roomId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error }, { status: 400 });
  }

  const { breakouts_active } = parsed.data;

  try {
    const supabase = await createAdminClient();

    // Verify parent room exists and caller is host
    const { data: room } = await supabase
      .from("rooms")
      .select("id, host_id, settings")
      .eq("code", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.host_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Only the host can update room settings" },
        { status: 403 }
      );
    }

    const currentSettings = (room.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      breakouts_active,
    };

    const { error: updateError } = await supabase
      .from("rooms")
      .update({ settings: updatedSettings })
      .eq("id", room.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, settings: updatedSettings }, { status: 200 });
  } catch (err) {
    console.error(`[PATCH /api/rooms/${roomId}/settings] Error:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
