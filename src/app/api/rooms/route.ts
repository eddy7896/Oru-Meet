import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const createRoomSchema = z.object({
  code: z.string().regex(/^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/, {
    message: "Invalid meeting code format",
  }),
  title: z.string().max(200).optional(),
});

// POST /api/rooms — create a new room record in Supabase
export async function POST(request: NextRequest) {
  // 1. Verify authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { code, title } = parsed.data;

  // 3. Create the room in Supabase
  try {
    const supabase = await createAdminClient();

    // TEMPORARY: Upsert the user into the profiles table so the foreign key constraint passes.
    // In production (Sprint 4), this will be handled by the Clerk webhook.
    const user = await currentUser();
    if (user) {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: user.fullName || user.firstName || "Unknown",
        email: user.primaryEmailAddress?.emailAddress,
        avatar_url: user.imageUrl,
      });
    }

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        code,
        host_id: userId,
        title: title ?? null,
        status: "waiting",
        livekit_room: code,
        is_locked: false,
        settings: {},
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/rooms] Supabase error:", error);
      // Handle duplicate code (unique constraint violation)
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A room with this code already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create room" },
        { status: 500 }
      );
    }

    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/rooms — list rooms created by the authenticated host
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createAdminClient();

    const { data: rooms, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("host_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
    }

    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("[GET /api/rooms] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
