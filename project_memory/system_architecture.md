# System Architecture — oru-meet

> **Purpose:** The authoritative technical blueprint. Consult this file before adding dependencies, changing data models, or modifying the WebRTC/signaling strategy.

---

## 🧱 Tech Stack

| Layer | Technology | Version / Notes |
|-------|-----------|----------------|
| **Framework** | Next.js | v14, App Router, TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui | Latest stable |
| **Auth** | Clerk | Latest — Next.js SDK |
| **Database** | Supabase | Postgres (hosted), RLS enabled |
| **ORM** | Supabase JS client | `@supabase/supabase-js` v2 |
| **Real-time** | Supabase Realtime | Channels for metadata, chat, events |
| **Video/Audio** | LiveKit | LiveKit Cloud + `@livekit/components-react` |
| **Deployment** | Vercel | Edge-compatible routes where applicable |
| **Package Manager** | pnpm | Preferred for monorepo speed |

---

## 📁 Folder Structure

```
oru-meet/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Clerk auth pages (sign-in, sign-up)
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (root)/                   # Public-facing pages
│   │   ├── page.tsx              # Home — create/join meeting
│   │   └── layout.tsx
│   ├── lobby/
│   │   └── [roomId]/
│   │       └── page.tsx          # Pre-join camera/mic check
│   ├── room/
│   │   └── [roomId]/
│   │       └── page.tsx          # Active meeting room
│   ├── api/
│   │   ├── livekit/
│   │   │   └── route.ts          # LiveKit access token endpoint
│   │   ├── rooms/
│   │   │   ├── route.ts          # POST create room, GET list rooms
│   │   │   └── [roomId]/
│   │   │       └── route.ts      # GET, PATCH, DELETE single room
│   │   └── polls/
│   │       └── route.ts          # Poll CRUD
│   ├── layout.tsx                # Root layout (ClerkProvider, fonts)
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui primitives (auto-generated)
│   ├── home/
│   │   ├── CreateMeetingCard.tsx
│   │   └── JoinMeetingForm.tsx
│   ├── lobby/
│   │   ├── DevicePreview.tsx
│   │   └── DeviceSelector.tsx
│   ├── room/
│   │   ├── VideoGrid.tsx
│   │   ├── ParticipantTile.tsx
│   │   ├── ControlBar.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── ParticipantsPanel.tsx
│   │   ├── WhiteboardPanel.tsx
│   │   ├── PollPanel.tsx
│   │   └── BreakoutRoomModal.tsx
│   └── shared/
│       ├── MeetingCodeBadge.tsx
│       └── UserAvatar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server Supabase client (cookies)
│   ├── livekit/
│   │   └── token.ts              # Token generation utility
│   ├── utils/
│   │   ├── meeting-code.ts       # Code generation logic
│   │   └── cn.ts                 # Class name utility
│   └── types/
│       └── index.ts              # All shared TypeScript types
├── hooks/
│   ├── useRoom.ts                # Room state from Supabase
│   ├── useChat.ts                # Realtime chat subscription
│   ├── useHandRaise.ts           # Hand raise events
│   ├── usePolls.ts               # Poll state and responses
│   └── useBreakoutRooms.ts       # Breakout room management
├── middleware.ts                 # Clerk auth middleware
├── project_memory/               # AI context files (this directory)
├── public/
├── .env.local                    # Environment variables (gitignored)
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 🗄️ Database Schema (Supabase / Postgres)

### `profiles`
Synced from Clerk webhooks.
```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY,           -- Clerk user ID
  full_name   TEXT,
  email       TEXT UNIQUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `rooms`
```sql
CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,    -- e.g. "abc-defg-hij"
  host_id       UUID REFERENCES profiles(id),
  title         TEXT,
  status        TEXT DEFAULT 'waiting',  -- waiting | active | ended
  is_locked     BOOLEAN DEFAULT FALSE,
  livekit_room  TEXT UNIQUE,            -- LiveKit room name (= code)
  settings      JSONB DEFAULT '{}',     -- future: recording, max participants
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ
);
```

### `participants`
```sql
CREATE TABLE participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id),
  role        TEXT DEFAULT 'participant', -- host | co_host | participant
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  left_at     TIMESTAMPTZ,
  is_admitted BOOLEAN DEFAULT FALSE
);
```

### `messages` (Chat)
```sql
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `polls`
```sql
CREATE TABLE polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,            -- [{ "id": "a", "text": "Option A" }]
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `poll_responses`
```sql
CREATE TABLE poll_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     UUID REFERENCES polls(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id),
  option_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)               -- one vote per user per poll
);
```

### `breakout_rooms`
```sql
CREATE TABLE breakout_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  livekit_room TEXT UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `breakout_assignments`
```sql
CREATE TABLE breakout_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakout_room_id UUID REFERENCES breakout_rooms(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES profiles(id)
);
```

---

## 📡 WebRTC & Signaling Data Flow

```
┌─────────────────────────────────────────────────────┐
│                   Client (Browser)                   │
│                                                      │
│   Next.js App ──► Clerk Auth                         │
│        │                                             │
│        ▼                                             │
│   POST /api/livekit                                  │
│        │  { roomId, userId, role }                   │
│        ▼                                             │
│   Next.js API Route ──► LiveKit SDK (server)         │
│        │               generates AccessToken         │
│        ▼                                             │
│   AccessToken returned to client                     │
│        │                                             │
│        ▼                                             │
│   @livekit/components-react                          │
│   LiveKitRoom(token, serverUrl)                      │
│        │                                             │
│        ▼                                             │
│   LiveKit Cloud SFU ◄──► All other participants      │
│                                                      │
│   ── Separate channel ──────────────────────────     │
│   Supabase Realtime (room:roomId)                    │
│     • chat messages                                  │
│     • hand-raise events                              │
│     • poll broadcasts                                │
│     • participant admit/deny signals                 │
│     • breakout room assignments                      │
└─────────────────────────────────────────────────────┘
```

### Token Permissions Matrix

| Role | canPublish | canSubscribe | canPublishData | roomAdmin |
|------|-----------|-------------|---------------|-----------|
| Host | ✅ | ✅ | ✅ | ✅ |
| Co-Host | ✅ | ✅ | ✅ | ❌ |
| Participant | ✅ (unless muted) | ✅ | ✅ | ❌ |

---

## 🔐 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

---

## 🔗 Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Home — create or join a meeting |
| `/lobby/[roomId]` | Pre-join lobby — camera/mic check |
| `/room/[roomId]` | Active meeting room |
| `/sign-in` | Clerk sign-in page |
| `/sign-up` | Clerk sign-up page |
| `POST /api/livekit` | Server: issue LiveKit access token |
| `POST /api/rooms` | Server: create a new room record |
| `GET /api/rooms/[roomId]` | Server: fetch room details |
| `POST /api/polls` | Server: create poll |
