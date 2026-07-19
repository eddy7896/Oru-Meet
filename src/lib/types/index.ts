/**
 * Shared TypeScript types for oru-meet.
 *
 * These types mirror the Supabase database schema defined in system_architecture.md.
 * Update both this file AND system_architecture.md if schema changes.
 */

// -- User / Auth --------------------------------------------------------------

export type ParticipantRole = "host" | "co_host" | "participant";

export interface Profile {
  id: string;           // Clerk user ID
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

// -- Rooms --------------------------------------------------------------------

export type RoomStatus = "waiting" | "active" | "ended";

export interface Room {
  id: string;
  code: string;         // e.g. "abc-defg-hij"
  host_id: string;
  title: string | null;
  status: RoomStatus;
  is_locked: boolean;
  livekit_room: string; // LiveKit room name (= code)
  settings: RoomSettings;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface RoomSettings {
  max_participants?: number;
  allow_recording?: boolean;
}

// -- Participants -------------------------------------------------------------

export interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  left_at: string | null;
  is_admitted: boolean;
  // Joined profile (from Supabase JOIN)
  profile?: Profile;
}

// -- Chat ---------------------------------------------------------------------

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  // Joined profile
  sender?: Profile;
}

// -- Polls --------------------------------------------------------------------

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  room_id: string;
  question: string;
  options: PollOption[];
  is_active: boolean;
  created_at: string;
  // Aggregated response counts (not stored in DB, computed client-side)
  response_counts?: Record<string, number>;
  user_response?: string | null;
}

export interface PollResponse {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  created_at: string;
}

// -- Breakout Rooms -----------------------------------------------------------

export interface BreakoutRoom {
  id: string;
  room_id: string;
  name: string;
  livekit_room: string;
  created_at: string;
}

export interface BreakoutAssignment {
  id: string;
  breakout_room_id: string;
  user_id: string;
}

// -- API Response Types -------------------------------------------------------

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface CreateRoomResponse {
  room: Room;
}

export interface LiveKitTokenResponse {
  token: string;
}
