import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLiveKitToken } from "@/lib/livekit/token";
import { createAdminClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  roomName: z.string().min(1).max(100),
  participantName: z.string().min(1).max(100),
  role: z.enum(["host", "co_host", "participant"]),
});

export async function POST(request: NextRequest) {
  // 1. Verify authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { roomName, participantName, role } = parsed.data;

  // 3. Upsert user into profiles and participants to ensure DB presence
  try {
    const supabase = await createAdminClient();
    const user = await currentUser();

    if (user) {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: participantName,
        email: user.primaryEmailAddress?.emailAddress,
        avatar_url: user.imageUrl,
      });
    }

    // roomName is the 'code' (e.g. abc-defg-hij), we need the UUID for participants table
    const { data: roomRecord, error: roomError } = await supabase
      .from("rooms")
      .select("id, host_id, is_locked")
      .eq("code", roomName)
      .single();

    if (roomError || !roomRecord) {
      throw new Error("Room not found in database");
    }

    const roomUuid = roomRecord.id;

    let isAdmitted = true;
    if (userId !== roomRecord.host_id) {
      const { data: hostProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", roomRecord.host_id)
        .single();
        
      const hostEmail = hostProfile?.email || "";
      const userEmail = user?.primaryEmailAddress?.emailAddress || "";
      
      const hostDomain = hostEmail.split("@")[1];
      const userDomain = userEmail.split("@")[1];
      
      if (hostDomain && userDomain && hostDomain === userDomain) {
        // Same organization -> automatically admit
        isAdmitted = true;
      } else {
        // Different organization or missing emails -> wait in lobby
        isAdmitted = false;
      }
    }

    const { data: existing } = await supabase
      .from("participants")
      .select("id, is_admitted")
      .eq("room_id", roomUuid)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      await supabase.from("participants").insert({
        room_id: roomUuid,
        user_id: userId,
        role,
        is_admitted: isAdmitted,
      });
    } else {
      if (existing.is_admitted) {
        isAdmitted = true;
      }
    }

    if (!isAdmitted) {
      return NextResponse.json({ waiting: true }, { status: 403 });
    }

  } catch (dbError) {
    console.error("[LiveKit Token] Failed to sync participant to DB:", dbError);
    // Proceed to give token anyway if DB fails? No, if DB fails we can't verify admission.
    // But since this is a catch block, we might fall through. Let's just return error.
    return NextResponse.json({ error: "Failed to verify room admission" }, { status: 500 });
  }

  // 4. Generate token
  try {
    const token = await generateLiveKitToken({
      roomName,
      participantName,
      participantId: userId,
      role,
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("[LiveKit Token Error]", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
