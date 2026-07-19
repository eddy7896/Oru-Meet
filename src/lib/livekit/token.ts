import { AccessToken, type VideoGrant } from "livekit-server-sdk";

export type ParticipantRole = "host" | "co_host" | "participant";

interface TokenOptions {
  roomName: string;
  participantName: string;
  participantId: string;
  role: ParticipantRole;
}

/**
 * Generates a LiveKit AccessToken scoped to a specific room and role.
 * Must only be called server-side.
 */
export async function generateLiveKitToken({
  roomName,
  participantName,
  participantId,
  role,
}: TokenOptions): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit API key and secret must be configured.");
  }

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Only the host gets full room admin (mute others, remove participants)
    roomAdmin: role === "host",
    // Co-hosts can manage participants but not close the room
    roomRecord: false,
  };

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName,
    // Token expires in 4 hours
    ttl: "4h",
  });

  token.addGrant(grant);
  return await token.toJwt();
}
