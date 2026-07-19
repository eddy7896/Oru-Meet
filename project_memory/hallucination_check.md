# Hallucination Check — oru-meet

> **Purpose:** A strict ruleset for the AI agent. These rules prevent scope creep, stack drift, aesthetic violations, and implementation assumptions. Check this file before making any architectural or design decision.

---

## 🔒 RULE 0 — Document Mutability Classification

> This rule is the first thing to check before touching **any** file in `project_memory/`.
> Every document has exactly one mutability class. There are no exceptions.

### 🧊 FROZEN — Never Edit Without an Explicit User Instruction

These documents represent decisions that have been **approved and locked**. Their content is ground truth. Editing them without the user explicitly asking is a critical violation.

| File | Why It Is Frozen |
|------|------------------|
| `user_demands_and_specs.md` | Contains the user's hard requirements and aesthetic rules. These were confirmed and approved. Changing them would silently break the contract with the user. |
| `system_context.md` | Defines the domain model, business logic, roles, and session lifecycle. These are foundational — altering them invalidates downstream architecture. |
| `user_needs.md` | Contains the implicit UX expectations (performance targets, error states, accessibility). These were defined once and are stable. |
| `hallucination_check.md` | The AI ruleset itself. Rules can **only be appended** (never deleted or reworded) and only after user approval. |

> ⛔ **FROZEN enforcement:** If you find yourself about to edit a FROZEN file while implementing a feature, **STOP**. You must first tell the user what you need to change and why, and receive explicit written approval before making any modification.

---

### 🌱 LIVING — Updated Regularly During Development

These documents are designed to evolve as the project progresses.

| File | What Changes | What Must NOT Change |
|------|-------------|---------------------|
| `system_memory.md` | Task status (`[ ]` → `[/]` → `[x]`), blockers, current phase, decision log | Completed task entries must not be deleted — only marked done |
| `system_architecture.md` | DB schema updates (with approval), new routes, updated folder structure | The core tech stack decisions (Next.js, Clerk, LiveKit, Supabase) — these are FROZEN within this file |

> ✅ **LIVING enforcement:** Update LIVING documents as work progresses. Always append to the Decision Log in `system_memory.md` when a new architectural decision is made. Never rewrite history — only add.

---

## 🚨 RULE 1 — Check `system_architecture.md` Before Adding Dependencies

> **BEFORE** installing any new package, verify that:
> 1. The package is not already listed in `user_demands_and_specs.md`
> 2. There is no existing utility in `/lib/` that covers the need
> 3. The package does not conflict with the existing stack
>
> **IF** a new dependency is needed and is not listed anywhere, **ASK THE USER** before installing it. Do not silently add packages.

---

## 🚨 RULE 2 — Do Not Alter the White Minimalist Aesthetic Without Permission

> The UI is governed by the constraints in `user_demands_and_specs.md` (Aesthetic section).
>
> **NEVER:**
> - Add dark backgrounds to primary surfaces
> - Add gradient backgrounds to cards or pages
> - Use neon, saturated, or vivid accent colors
> - Add heavy drop shadows (`shadow-lg`, `shadow-xl`, `shadow-2xl`)
> - Add bouncy or attention-seeking animations
>
> **IF** a design element feels like it conflicts with the minimalist aesthetic, **ASK THE USER** rather than applying your judgment.

---

## 🚨 RULE 3 — Verify WebRTC Logic Before Writing UI

> LiveKit handles all media transport. Do **NOT**:
> - Write raw `RTCPeerConnection` code — LiveKit abstracts this
> - Call LiveKit SDK methods that don't exist in `@livekit/components-react` or `livekit-client`
> - Invent LiveKit API signatures — always verify against the official LiveKit docs / installed SDK types
>
> When in doubt about a LiveKit feature, state the uncertainty explicitly and check the docs before proceeding.

---

## 🚨 RULE 4 — Do Not Change the Database Schema Without Approval

> The authoritative schema is in `system_architecture.md`.
>
> - Do **NOT** add columns, tables, or indexes without updating `system_architecture.md` and getting user approval
> - Do **NOT** drop or rename columns without confirming there are no existing references in the codebase
> - Do **NOT** bypass Row Level Security policies — always write queries that respect RLS

---

## 🚨 RULE 5 — Auth is Handled by Clerk Only

> - Do **NOT** implement custom JWT handling — Clerk manages tokens
> - Do **NOT** store passwords or auth credentials in Supabase — use Clerk user IDs only
> - Always use `auth()` from `@clerk/nextjs/server` in Server Components and API routes
> - Always use `useUser()` / `useAuth()` from `@clerk/nextjs` in Client Components
> - The Supabase `profiles` table is synced via Clerk webhooks — do **NOT** create profile records manually

---

## 🚨 RULE 6 — Respect the Role Permission Matrix

> Refer to the token permissions matrix in `system_architecture.md`.
>
> - **Host** = full room admin + publish + subscribe
> - **Co-Host** = publish + subscribe + data (no room admin)
> - **Participant** = publish (can be restricted by host) + subscribe + data
>
> Do **NOT** grant `roomAdmin` LiveKit permissions to Co-Hosts or Participants without user approval.

---

## 🚨 RULE 7 — No Silent Feature Removals

> If a functional requirement from `user_demands_and_specs.md` cannot be implemented due to a technical limitation:
> - State the limitation clearly
> - Propose a specific alternative
> - Wait for user approval before deviating

---

## 🚨 RULE 8 — Always Validate API Inputs with Zod

> Every API Route (`/app/api/**`) MUST:
> - Parse and validate the request body with a `zod` schema before processing
> - Return structured error responses on validation failure (`400` with error details)
> - Never trust client-supplied `roomId`, `userId`, or `role` without server-side verification

---

## 🚨 RULE 9 — Keep This File Updated

> After every Phase 3 sprint, review this file. If new patterns emerge that could cause future mistakes, add a new rule. Date-stamp any additions.

---

## 🚨 RULE 10 — Enforce Document Mutability at All Times

> Before editing **any** file in `project_memory/`, explicitly check RULE 0.
>
> **Operational procedure:**
> 1. Identify which file you are about to write to.
> 2. Look up its mutability class in the RULE 0 table.
> 3. If it is **FROZEN** → stop, explain the needed change to the user, and wait for explicit written approval.
> 4. If it is **LIVING** → proceed, but follow the "What Must NOT Change" column constraints.
>
> **Specifically FORBIDDEN without user approval:**
> - Rewriting or paraphrasing any sentence in `user_demands_and_specs.md`
> - Removing any requirement from `user_demands_and_specs.md` (even if it seems outdated)
> - Changing the domain model in `system_context.md`
> - Deleting or softening any rule in `hallucination_check.md`
> - Changing the tech stack entries in `system_architecture.md` (routing strategy, framework, auth provider, DB, WebRTC)
>
> **Violation consequence:** If you edit a FROZEN document without approval, you must immediately notify the user of the change, provide a diff of what was altered, and restore the original content.

---

## ✅ Pre-Implementation Checklist

Before writing code for any new feature, verify:

- [ ] Is the feature listed in `user_demands_and_specs.md`?
- [ ] Are all required dependencies already installed?
- [ ] Does the DB schema support this feature, or does it need to be updated?
- [ ] Is auth properly gated for this route/API?
- [ ] Does the UI follow the white minimalist aesthetic constraints?
- [ ] Are all error states handled (not just the happy path)?
- [ ] Is input validated with Zod before any DB or LiveKit call?

---

## 📅 Rule Additions Log

| Date | Rule Added / Modified | Reason |
|------|-----------------------|--------|
| 2026-07-18 | All 9 rules created | Initial project setup |
| 2026-07-18 | RULE 0 added — Document Mutability Classification | User requested explicit living vs frozen constraints for all `project_memory/` files |
| 2026-07-18 | RULE 10 added — Enforce Document Mutability | Operational enforcement procedure for RULE 0 |
