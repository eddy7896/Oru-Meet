# System Memory — oru-meet

> **Last Updated:** 2026-07-18
> **Current Phase:** Phase 3 — Development Kickoff

---

## 🟢 Current Status

| Key | Value |
|-----|-------|
| Phase | 3 — Development Kickoff |
| Active Sprint | Sprint 4 — Communication Layer |
| Blocking Issue | None |
| Immediate Next Step | Build ChatPanel Supabase persistence + hand-raise + room lock |

---

## ✅ Completed Tasks

- [x] Phase 1 Discovery questions answered by user
- [x] Tech stack confirmed (see `system_architecture.md`)
- [x] All Phase 2 documentation files created
- [x] **Sprint 1 Complete:**
  - [x] Next.js 16 App Router project initialized (pnpm)
  - [x] All core dependencies installed (Clerk, Supabase, LiveKit, Zod, etc.)
  - [x] Tailwind v4 design system configured (`globals.css`)
  - [x] Inter font loaded via `next/font/google`
  - [x] Root layout with `ClerkProvider` wired up
  - [x] `proxy.ts` auth gate (Next.js 16 convention)
  - [x] Clerk sign-in / sign-up pages created
  - [x] Supabase browser + server clients created
  - [x] LiveKit token utility + `/api/livekit` route handler
  - [x] `cn()`, `generateMeetingCode()`, shared TypeScript types
  - [x] `.env.local` template created
  - [x] Production build passes — 0 TypeScript errors
- [x] **Sprint 2 Complete:**
  - [x] Home page -- Create Meeting + Join Meeting with auto-format code input
  - [x] `CreateMeetingButton` -- generates cryptographic code, navigates to lobby as host
  - [x] `JoinMeetingForm` -- validates code format, navigates to lobby as participant
  - [x] Lobby page (Server Component) -- awaits params per Next.js 16 async convention
  - [x] `LobbyClient` -- camera/mic preview, permission error states, device toggles, copy link, Join Now
  - [x] Room page shell -- dark layout, header with code badge, control bar skeleton
  - [x] All 7 routes compile: 0 TypeScript errors

---

## 🚧 In Progress

- [x] **Sprint 3 Complete:**
  - [x] `POST /api/rooms` — create room in Supabase (Zod validated, Clerk gated)
  - [x] `GET /api/rooms/[roomId]` — fetch room by code
  - [x] `PATCH /api/rooms/[roomId]` — update status (host only, timestamps auto-managed)
  - [x] `CreateMeetingButton` — now calls `POST /api/rooms` before navigating to lobby
  - [x] `RoomClient` — fetches LiveKit token, renders `<LiveKitRoom>` with audio+video
  - [x] `VideoGrid` — `GridLayout` + `ParticipantTile` with camera/screen tracks
  - [x] `ControlBar` — mic/cam/screen toggles, chat/participants panel toggles, leave/end meeting with confirmation dialog
  - [x] `ChatPanel` — real-time in-call chat via LiveKit `useChat` data channel
  - [x] `ParticipantsPanel` — lists all participants with mic/cam indicators; host sees mute/remove buttons
  - [x] `CopyCodeButton` — client component that copies full meeting link to clipboard
  - [x] `useRoom` hook — Supabase Realtime subscription for room state
  - [x] SQL migration file — all 8 tables + RLS policies (`supabase/migrations/001_initial_schema.sql`)
  - [x] Production build passes — 0 TypeScript errors, all 9 routes compiled
- [x] **Sprint 4 Complete:**
  - [x] `useChat` hook — Supabase Realtime backed persistence
  - [x] Room Lock — `is_locked` prevents joining; creates Waiting Lobby
  - [x] `ParticipantsPanel` — Host can see waiting users and Admit them
  - [x] Hand Raise — Synced via LiveKit data channels
  - [x] Host "End Meeting" — Redirects all users to `/ended`
  - [x] Webhook setup — Syncs Clerk profiles to Supabase
- [x] **Sprint 5 Complete:**
  - [x] Host Moderation — Kick and Mute participants via `livekit-server-sdk`
  - [x] Polls — Host can create polls, participants can vote, synced via Supabase Realtime
  - [x] Whiteboard — Embedded `tldraw` component for personal whiteboarding
- [x] **Sprint 6 Complete:**
  - [x] Breakout Rooms Backend — `api/breakouts` and `api/breakouts/assign` to manage sub-rooms
  - [x] Breakout Panel UI — Host controls to create, assign, and launch rooms
  - [x] Redirection — Participants automatically redirect to their assigned breakout room when launched
- [x] **Sprint 7 Complete:**
  - [x] Mobile Responsiveness — Added CSS media queries for phone/tablet portrait support and slide-up modal behavior for side panels
  - [x] Advanced Settings — Integrated `@livekit/track-processors` for Virtual Background Blur
  - [x] Device Selection — Added modal for dynamic camera and microphone selection mid-call
  - [x] Easy Invites — Added Invite modal with copy link and mailto share hooks
- [x] **Sprint 8 Complete:**
  - [x] UI Foundation — Extracted raw tailwind classes into a Google Meet inspired `.room-theme` using CSS variables
  - [x] Component Library — Created reusable `<Button>`, `<IconButton>`, and `<Panel>` components for consistency
  - [x] Global Refactor — Refactored all room components to use the semantic design system

---

## 📋 Upcoming (Phase 3 — Development Kickoff)

1. Initialize Next.js 14 App Router project with TypeScript
2. Install and configure Tailwind CSS + shadcn/ui
3. Set up Clerk authentication (middleware + providers)
4. Initialize Supabase project and apply DB schema
5. Configure LiveKit server credentials (LiveKit Cloud)
6. Build routing structure (`/`, `/lobby/[roomId]`, `/room/[roomId]`)
7. Build Home page (create/join meeting UI)
8. Build Lobby/Pre-join page (camera/mic preview and permissions)
9. Build Room page (video grid, toolbar, side panels)
10. Build whiteboard, breakout rooms, and polls features

---

## 🔴 Active Blockers

_None at this time._

---

## 📓 Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-18 | Next.js App Router | Best DX for full-stack monorepo on Vercel |
| 2026-07-18 | LiveKit | Managed SFU, excellent React SDK, easiest scaling |
| 2026-07-18 | Clerk | Beautiful pre-built auth UI, fast integration |
| 2026-07-18 | Supabase | Postgres + real-time subscriptions in one platform |
| 2026-07-18 | Tailwind + shadcn/ui | Optimal for clean, white minimalist design system |
| 2026-07-18 | Phase 2 approved by user | All 6 documentation files confirmed, Phase 3 kicked off |
| 2026-07-18 | proxy.ts over middleware.ts | Next.js 16 renamed middleware to proxy — updated accordingly |
| 2026-07-18 | toJwt() is async in livekit-server-sdk v2 | Required awaiting the JWT generation call |
| 2026-07-18 | Sprint 1 build passes | 0 TypeScript errors, all 5 routes compiled |
| 2026-07-18 | Clerk v7: afterSignOutUrl moved to ClerkProvider | UserButton no longer accepts this prop -- configure on ClerkProvider instead |
| 2026-07-18 | Turbopack panics on U+2500 box-drawing chars in JSX comments | Replace all Unicode decorators with plain ASCII hyphens in .tsx files |
| 2026-07-18 | Sprint 2 build passes | 0 TypeScript errors, all 7 routes compiled |
| 2026-07-18 | Vercel | Zero-config deployment for Next.js, compatible with Edge Runtime |
