# System Context — oru-meet

> **Purpose:** Defines the domain logic, business goals, and the conceptual model of the virtual classroom application.

---

## 🎯 Product Vision

**oru-meet** is a virtual classroom platform designed for educators and students. It combines the reliability of Google Meet's real-time video infrastructure with purpose-built educational tools (whiteboards, polls, breakout rooms) in a clean, distraction-free interface.

**Target Users:**
- **Teachers / Hosts** — Create and manage sessions, control participant permissions, moderate content
- **Teaching Assistants / Co-Hosts** — Assist the host, manage breakout rooms, moderate chat
- **Students / Participants** — Join sessions, raise hands, interact via chat, polls, and whiteboard

---

## 🏫 Core Domain Concepts

### 1. Meeting (Session)
A real-time video conference room with a unique, short alphanumeric **Meeting Code** (e.g., `abc-defg-hij`).
- Created by a **Host** (authenticated user)
- Accessible via a **shareable link**: `https://oru-meet.vercel.app/room/abc-defg-hij`
- Has lifecycle states: `scheduled → active → ended`

### 2. Participant
Any user inside a meeting room.

| Role | Capabilities |
|------|-------------|
| **Host** | Full control — mute all, remove participants, lock room, end meeting, manage features |
| **Co-Host** | Elevated — can mute participants, manage breakout rooms, admit users from lobby |
| **Participant** | Standard — share camera/mic, chat, raise hand, join polls, use whiteboard |

### 3. Lobby (Pre-Join Screen)
Before entering a room, every participant sees a **lobby** where they:
- Preview their camera/mic feed
- Select audio/video devices
- See if the host has allowed them in (if room is locked)

### 4. Signaling & Media Flow
- **Signaling:** Supabase Realtime channels carry room metadata, participant events, chat, hand-raises, poll state, and breakout room assignments
- **Media:** LiveKit SFU handles all audio/video/screen-share tracks — participants never connect peer-to-peer directly

### 5. Meeting Code Logic
- Generated on room creation: short, human-readable, hyphen-separated code
- Stored in Supabase `rooms` table alongside host ID, settings, and creation timestamp
- Used as the LiveKit room name (or mapped to a LiveKit room name)
- Codes are **single-use by session** — once a meeting ends, the code is invalidated

---

## 🔄 Session Lifecycle

```
[Host Creates Room]
       │
       ▼
[Supabase: room record created, status = "waiting"]
       │
       ▼
[Host Enters Lobby → Camera/Mic Preview]
       │
       ▼
[Host Starts Meeting → LiveKit room token issued]
       │
       ▼
[Participants Join via Code or Link → Lobby Gate]
       │
       ├── Host admits → Participant enters room
       └── Host rejects → Participant denied
       │
       ▼
[Active Session: video/audio via LiveKit, metadata via Supabase Realtime]
       │
       ▼
[Host Ends Meeting → LiveKit room closed, Supabase room status = "ended"]
```

---

## 📚 Educational Features Context

| Feature | Who Uses It | Purpose |
|---------|------------|---------|
| **Hand Raise** | Participants | Signal intent to speak without interrupting |
| **In-Call Chat** | All | Text-based Q&A, links, resources |
| **Collaborative Whiteboard** | Host/Co-Host (draw), All (view) | Visual teaching aid, diagrams |
| **Polls / Quizzes** | Host creates, All respond | Real-time comprehension checks |
| **Breakout Rooms** | Host/Co-Host manages | Small group work, group discussions |
| **Screen Share** | Any role (with permission) | Share slides, documents, demos |
| **Recording** | Host only (future) | Session replay for absent students |
