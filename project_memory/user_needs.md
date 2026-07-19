# User Needs — oru-meet

> **Purpose:** Implicit UX goals — the things users expect even when they haven't explicitly asked for them. These govern interaction design, error handling, and perceived performance.

---

## ⚡ Performance & Load Time

| Goal | Target | Implementation Strategy |
|------|--------|------------------------|
| First Contentful Paint | < 1.2s | Next.js App Router + static home page |
| Time to Interactive | < 2.0s | Minimal JS on home/lobby pages |
| Video join latency | < 3.0s | Pre-fetch LiveKit token in lobby |
| No layout shift (CLS) | CLS < 0.1 | Fixed dimensions on video tiles |

- Use `next/font` for zero-CLS font loading
- Use `next/image` for all images
- Lazy-load heavy panels (whiteboard, breakout modal) with `dynamic()` imports
- Prefetch LiveKit token the moment user enters the lobby

---

## 🎥 Media Device Handling

### Camera & Microphone Permissions
- **Proactively request** camera + mic permissions the moment user enters `/lobby/[roomId]`
- Show a **clear, friendly permission prompt UI** if the browser blocks access (not a generic error)
- Explain _why_ permissions are needed: "oru-meet needs camera and microphone access to connect you to the class"

### Permission Error States
| Scenario | User-Facing Message |
|----------|-------------------|
| Camera denied | "Camera access was blocked. Please allow it in your browser settings." + link to instructions |
| Mic denied | "Microphone access was blocked. Please allow it in your browser settings." |
| No camera found | "No camera detected. You can still join with audio only." |
| No mic found | "No microphone detected. You can still join and listen." |

### Device Selection
- Show a dropdown to select camera, microphone, and speaker before joining
- Persist device selection in `localStorage` for next session
- Default to the system default device on first visit

---

## 🚦 Error States & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Invalid meeting code | Show inline error: "No meeting found with this code. Please check and try again." |
| Ended meeting | Dedicated `/room/ended` page: "This meeting has ended." with a "Go Home" button |
| Network disconnection | Toast notification: "Reconnecting…" — LiveKit handles reconnect automatically |
| Host left room | If host disconnects: toast "The host has left the meeting" (meeting continues until host ends it) |
| Kicked from room | Redirect to `/` with a toast: "You have been removed from the meeting" |
| Room at capacity | Error page: "This meeting is full. Please contact the host." (future feature) |
| Unauthorized access | If not authenticated: redirect to sign-in, then back to lobby |

---

## 🔔 Notifications & Feedback

- **Toast messages** (via shadcn/ui `Sonner`) for: join events, chat messages while chat is closed, hand raises, poll launches
- **Audio cues** (optional, subtle): participant joins/leaves sound (future enhancement)
- **Visual indicators** on muted/unmuted state — never silent failures
- **Loading states** on every async action — no button should be pressable twice while loading
- **Confirmation dialogs** for destructive actions:
  - "End Meeting for Everyone" → requires confirmation
  - "Remove Participant" → requires confirmation
  - "Clear Whiteboard" → requires confirmation

---

## 🧭 Intuitive Navigation

- The **home page** should have exactly two clear calls to action: "Start a Meeting" and "Join with a code"
- The **room toolbar** must be centered at the bottom of the screen (Google Meet style)
- Panel toggles (Chat, Participants, Whiteboard, Polls) should not move the video grid — use a fixed side panel
- The **meeting code** must always be visible and copyable in the room header
- "Leave Meeting" and "End Meeting" must be distinctly separated in the UI (red button vs. a secondary option)

---

## ♿ Accessibility

- All interactive elements have descriptive `aria-label` attributes
- Full keyboard navigation support in lobby and room controls
- Screen reader-friendly participant list
- Color is never the only indicator of state (e.g., mute icon changes shape, not just color)

---

## 🔒 Security & Privacy (Implicit Expectations)

- Participants should NOT be able to join a room without authentication (Clerk gate)
- Meeting codes should not be guessable (cryptographically random generation)
- Supabase Row Level Security (RLS) prevents reading other users' room data
- LiveKit tokens should expire after a reasonable duration (e.g., 4 hours) and be scoped to the specific room
- Chat messages should only be visible to participants of that specific room
