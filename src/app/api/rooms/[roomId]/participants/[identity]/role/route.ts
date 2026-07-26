import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { z } from "zod";

const patchSchema = z.object({
  role: z.enum(["host", "co_host", "participant"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; identity: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId, identity } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { role } = parsed.data;

  try {
    const supabase = await createAdminClient();

    // Verify caller is the host of this room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, host_id")
      .eq("code", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.host_id !== userId) {
      return NextResponse.json({ error: "Forbidden: Only hosts can change roles" }, { status: 403 });
    }

    // Update DB
    await supabase
      .from("participants")
      .update({ role })
      .eq("room_id", room.id)
      .eq("user_id", identity);

    const liveKitUrl = process.env.LIVEKIT_API_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!liveKitUrl || !apiKey || !apiSecret) {
      throw new Error("LiveKit credentials not configured");
    }

    const roomService = new RoomServiceClient(liveKitUrl, apiKey, apiSecret);
    
    // Update LiveKit permissions
    await roomService.updateParticipant(roomId, identity, undefined, {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: role === "host", // Make host means give admin grants
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH role] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
