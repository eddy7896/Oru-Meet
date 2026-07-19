import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLiveKitToken } from "@/lib/livekit/token";

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

  // 3. Generate token
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
