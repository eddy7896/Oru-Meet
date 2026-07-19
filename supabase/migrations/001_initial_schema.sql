-- ============================================================
--  oru-meet — Supabase Database Migration
--  Apply this in the Supabase Dashboard → SQL Editor
--  Or via: supabase db push (if using Supabase CLI)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
--  PROFILES
--  Synced from Clerk via webhook (/api/webhooks/clerk)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,            -- Clerk user_id (e.g. "user_2abc...")
  full_name   TEXT,
  email       TEXT UNIQUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid()::TEXT = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid()::TEXT = id);

-- Service role bypass (for webhook inserts)
CREATE POLICY "Service role can manage all profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
--  ROOMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,        -- e.g. "abc-defg-hij"
  host_id       TEXT REFERENCES profiles(id),
  title         TEXT,
  status        TEXT DEFAULT 'waiting'       -- waiting | active | ended
                  CHECK (status IN ('waiting', 'active', 'ended')),
  is_locked     BOOLEAN DEFAULT FALSE,
  livekit_room  TEXT UNIQUE,                 -- LiveKit room name (= code)
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ
);

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS rooms_code_idx ON rooms (code);
CREATE INDEX IF NOT EXISTS rooms_host_id_idx ON rooms (host_id);

-- RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read a room (to validate codes before joining)
CREATE POLICY "Authenticated users can view rooms"
  ON rooms FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the host can insert or update their own rooms
CREATE POLICY "Hosts can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid()::TEXT = host_id);

CREATE POLICY "Hosts can update their own rooms"
  ON rooms FOR UPDATE
  USING (auth.uid()::TEXT = host_id);

-- Service role bypass
CREATE POLICY "Service role can manage all rooms"
  ON rooms FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
--  PARTICIPANTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES profiles(id),
  role        TEXT DEFAULT 'participant'
                CHECK (role IN ('host', 'co_host', 'participant')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  left_at     TIMESTAMPTZ,
  is_admitted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS participants_room_id_idx ON participants (room_id);
CREATE INDEX IF NOT EXISTS participants_user_id_idx ON participants (user_id);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view participants in their rooms"
  ON participants FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert themselves as participants"
  ON participants FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update their own participant record"
  ON participants FOR UPDATE
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Service role can manage all participants"
  ON participants FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
--  MESSAGES (Chat)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id   TEXT REFERENCES profiles(id),
  content     TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_room_id_idx ON messages (room_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Only participants in the room can read/send messages
CREATE POLICY "Room participants can view messages"
  ON messages FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.room_id = messages.room_id
        AND p.user_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Room participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid()::TEXT = sender_id
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.room_id = messages.room_id
        AND p.user_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Service role can manage all messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
--  POLLS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,               -- [{ "id": "a", "text": "Option A" }]
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS polls_room_id_idx ON polls (room_id);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room participants can view polls"
  ON polls FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.room_id = polls.room_id
        AND p.user_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Hosts can create polls"
  ON polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = polls.room_id
        AND r.host_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Hosts can update polls"
  ON polls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = polls.room_id
        AND r.host_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Service role can manage all polls"
  ON polls FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
--  POLL RESPONSES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poll_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     UUID REFERENCES polls(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES profiles(id),
  option_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)                  -- one vote per user per poll
);

CREATE INDEX IF NOT EXISTS poll_responses_poll_id_idx ON poll_responses (poll_id);

ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view poll responses in their rooms"
  ON poll_responses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can submit poll responses"
  ON poll_responses FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Service role can manage all poll responses"
  ON poll_responses FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
--  BREAKOUT ROOMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS breakout_rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  livekit_room TEXT UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS breakout_rooms_room_id_idx ON breakout_rooms (room_id);

ALTER TABLE breakout_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room participants can view breakout rooms"
  ON breakout_rooms FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Hosts can manage breakout rooms"
  ON breakout_rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = breakout_rooms.room_id
        AND r.host_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Service role can manage all breakout rooms"
  ON breakout_rooms FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
--  BREAKOUT ASSIGNMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS breakout_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakout_room_id UUID REFERENCES breakout_rooms(id) ON DELETE CASCADE,
  user_id          TEXT REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS breakout_assignments_room_idx ON breakout_assignments (breakout_room_id);

ALTER TABLE breakout_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their assignments"
  ON breakout_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage all assignments"
  ON breakout_assignments FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
--  REALTIME — Enable channels for live updates
-- ─────────────────────────────────────────────────────────────
-- Run these if you need to enable Realtime on specific tables.
-- In the Supabase Dashboard: Database → Replication → enable for each table.
-- ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE participants;
-- ALTER PUBLICATION supabase_realtime ADD TABLE polls;
-- ALTER PUBLICATION supabase_realtime ADD TABLE poll_responses;
-- ALTER PUBLICATION supabase_realtime ADD TABLE breakout_assignments;
