# User Demands & Specifications — oru-meet

> **Purpose:** Hard requirements. These are non-negotiable constraints that govern every design and implementation decision.

---

## 🎨 UI/UX Aesthetic: Clean White Minimalism

### Core Aesthetic Constraints (NON-NEGOTIABLE)

1. **Background:** Pure white (`#FFFFFF`) or very light grey (`#F9FAFB`) — no dark backgrounds on main surfaces
2. **Typography:** Crisp, high-contrast. Primary text `#111827`, secondary `#6B7280`
3. **Borders:** Subtle, light — `1px solid #E5E7EB` or `1px solid #F3F4F6` only
4. **Shadows:** Minimal — only `shadow-sm` or at most `shadow-md` (NO dramatic drop shadows)
5. **Color Accents:** A single, restrained accent color — Google Blue `#1A73E8` for primary actions
6. **Spacing:** Generous padding and whitespace everywhere. Never cramped. Minimum `p-6` on cards
7. **Rounded Corners:** Consistent — buttons `rounded-lg`, cards `rounded-xl`, dialogs `rounded-2xl`
8. **Animations:** Subtle only — fade-ins (`duration-200`), slides (`duration-300`). No bouncy or flashy effects
9. **Icons:** Lucide React exclusively (matches shadcn/ui)
10. **Font:** `Inter` (Google Fonts) — loaded via `next/font/google`

### What is Explicitly FORBIDDEN

- ❌ Dark mode (unless user explicitly requests it later)
- ❌ Gradient backgrounds on main surfaces
- ❌ Neon or vivid saturated accent colors
- ❌ Heavy card shadows
- ❌ Emoji in UI (except in chat messages, which users write)
- ❌ Cluttered toolbars or panels

---

## 🔗 Meeting Code & Link Logic

### Code Format
- **Pattern:** `xxx-xxxx-xxx` (3-4-3 alphanumeric, lowercase, hyphen-separated)
- **Example:** `abc-defg-hij`
- **Length:** 10 characters + 2 hyphens = 12 characters total
- **Character Set:** lowercase a-z and 0-9 (no ambiguous chars: 0/O, 1/l/I)
- **Generation:** Cryptographically random via `crypto.randomUUID()` → mapped to format

### Shareable Link Format
```
https://oru-meet.vercel.app/room/abc-defg-hij
```
- Clicking this link takes the user directly to the **lobby** page for that room
- If the user is not authenticated, Clerk redirects to sign-in first, then back to lobby

### Join Flow
1. User enters code on home page OR clicks a direct link
2. System validates code exists in Supabase `rooms` table and status is not `"ended"`
3. User is taken to `/lobby/[roomId]` for camera/mic preview
4. If room is locked: user waits in lobby until host admits them
5. If room is open: user proceeds directly to `/room/[roomId]`

### Code Invalidation
- Code is invalidated when host calls "End Meeting" → `rooms.status = "ended"`
- Attempting to join an ended room shows an informative error page (not a 404)

---

## 📦 Agreed Libraries & Packages

### Core
- `next` v14
- `react`, `react-dom`
- `typescript`

### Styling
- `tailwindcss`, `postcss`, `autoprefixer`
- `@shadcn/ui` (installed via `npx shadcn@latest init`)
- `lucide-react` (icons)
- `class-variance-authority`, `clsx`, `tailwind-merge`

### Auth
- `@clerk/nextjs`

### Database
- `@supabase/supabase-js` v2
- `@supabase/ssr` (server-side Supabase for App Router)

### Video/Audio
- `livekit-client`
- `@livekit/components-react`
- `@livekit/components-styles`

### Utilities
- `livekit-server-sdk` (server-side token generation)
- `zod` (schema validation on API routes)
- `date-fns` (date formatting)

---

## ⚙️ Functional Requirements (Hard)

| # | Requirement | Priority |
|---|-------------|----------|
| F1 | Authenticated users can create a meeting with one click | P0 |
| F2 | Joining via meeting code from the home page | P0 |
| F3 | Joining via direct link | P0 |
| F4 | Camera/mic preview in lobby before joining | P0 |
| F5 | Host can mute/unmute any participant | P0 |
| F6 | Host can remove a participant from the room | P0 |
| F7 | Host can end the meeting for everyone | P0 |
| F8 | Participant can raise/lower hand | P0 |
| F9 | In-call text chat (persisted in Supabase) | P0 |
| F10 | Screen sharing (via LiveKit) | P1 |
| F11 | Collaborative whiteboard | P1 |
| F12 | Polls/Quizzes (host creates, all respond) | P1 |
| F13 | Breakout rooms (host assigns, LiveKit sub-rooms) | P2 |
| F14 | Room lock (host must admit each participant) | P1 |
| F15 | Copy meeting link to clipboard button | P0 |

---

## 📱 Responsiveness Requirements

- **Desktop first** design (1280px+ primary target)
- Must be functional on tablet (768px+)
- Mobile layout is a future enhancement — not required for v1
