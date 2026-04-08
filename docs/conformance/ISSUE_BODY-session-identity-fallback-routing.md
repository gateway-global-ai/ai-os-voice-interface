# [Session identity] Runtime agent prompt and fallback routing default to governance despite edited session intent

## Title (GitHub)

`[Session identity] Runtime agent identity / fallback routing ignore edited session intent — governance defaults still win`

---

## Summary

Runtime **voice** and **chat** still behave like a **governance-forward** assistant after the user edits **System Configuration** (name, role, user intent). The **Governance work modes** grid and **governance.documents.list**-style flows appear when the user asked for **Workspace**-oriented actions (e.g. email for today). Chat can **promise** opening Workspace without a visible governed handoff, then **narrate** as “AIOS Governance Agent” anyway.

This is **not** the same as **#13** (mail formatter), **#14** (Workspace auth/readiness parity), or **#15** (calendar disambiguation). Those issues assume **intent routing and persona** are aligned; this issue says they are **not** yet authoritative.

---

## Core question

**What is the single authoritative source for (a) active session identity / system prompt and (b) fallback routing when intent is ambiguous or fulfillment fails — and why does governance still win after the user changes session intent?**

---

## Evidence (2026-04-07 session)

**Attach to the GitHub issue:** screenshots showing:

- **System Configuration** with **User intent** edited toward personal / Workspace goals while **Agent identity** fields still show governance defaults (or edit UX fighting the user — e.g. field focus / modal closing).
- **Chat** where the assistant first agrees to open Workspace for email, then later replies as **“AIOS Governance Agent for Gateway Global”** with governance-only next steps.
- **Governance work modes** grid / **Menu** path appearing as the dominant launcher after a **Workspace**-oriented request.
- Optional: shell **Google Workspace** line vs **Mail** panel outcomes (mixed messaging may combine **#14** verification with this issue’s **routing/persona** problem).

**Testing notes (verbatim):** User reported the profile intent field was hard to edit (modal closing); had to delete/backspace to change text. After updating intent, runtime still used **governance agent** speech. UI still feels like a **dashboard / menu app** (tiles, modals) rather than a single persistent voice session.

---

## Architectural hypothesis (three authorities)

| Authority | What it is | Failure mode observed |
|-----------|------------|------------------------|
| **1. Session profile / form state** | `SystemConfiguration` / React state for name, company, role, **user intent**, **agent intent** | Edits appear in UI but **do not reliably dominate** runtime behavior; or **wrong field** edited (e.g. user intent vs **agent intent**). |
| **2. Runtime agent node** | `systemInstruction` passed to Gemini (voice + chat) | Still receives **long default governance instructions** in **AGENT INTENT** plus hard-coded prompt scaffolding → governance **persona and routing bias**. |
| **3. Surface routing defaults** | Menu → governance hub, `governance.documents.list`, work-mode grid | **Unresolved** or **non-emitted** `INTENT_JSON` may fall back to **governance**-shaped surfaces instead of neutral clarification, **auth_required**, or Workspace hub. |

---

## High-probability root causes (verify in code)

1. **`agentIntent` default is governance-specific and large** — It is concatenated into every `systemInstruction` as **`AGENT INTENT:`** alongside **`USER INTENT:`**. If the user only changes **user intent**, **agent intent** can still **override** the desired operator persona. **Owner:** `src/App.tsx` (`useState` defaults for `agentIntent`, `agentName`, `agentRole`; `generateContent` / chat `systemInstruction` blocks ~1254–1282 and ~1380+).

2. **No durable session profile** — Profile may be **in-memory only** (no `localStorage` / server sync), so refresh or code paths reset defaults.

3. **Governance canvas routing** — Shell pipeline (`runShellAndGovernancePipeline` / `routeShellAgentText`) and menu defaults may **prefer governance surfaces** when intent is missing or parser returns delegate paths.

4. **Product / UX** — “Governance work modes” **grid** is a **launcher** pattern; voice-first OS expectations may require **overlay + outcomes** instead of catalog navigation (separate UX track **after** identity authority is fixed).

---

## Expected behavior

- The **active session node** (the runtime that sends `systemInstruction` to the model) **must** use the **same** identity and intent the user set in **System Configuration**, or **explicitly** refuse / show an error if not applied.
- **Agent intent** vs **user intent** must be **understandable**: if both exist, document which wins and why; avoid duplicate/conflicting “governance” paragraphs in **agent intent** when the user chose a non-governance role.
- On **ambiguous** or **failed** fulfillment:
  - **Clarify**, or
  - Surface **`auth_required`**, or
  - Report **execution failed**,
  - **Not** silently **default to governance hub** or governance-only narration.
- **Governance** surfaces appear only when the user **asks for governance** or **explicitly opens** governance — not as the **default recovery** for Workspace asks.

**Normative alignment (non-exhaustive):** **AIOS-SPEC-009** §2.1 (shell vs domain fulfillment), §12 (disclosure truth); product promise: voice-first shell, not app catalog.

---

## Scope

- **In:** `App.tsx` system prompt composition; persistence of session profile; shell/governance delegation when `INTENT_JSON` is missing or `none`; chat vs voice parity for the same profile.
- **Related verification:** **#14** live-close (shell vs panel auth line) — if **connected** appears without executable token, capture whether that is residual **#14** vs this issue’s **prompt/routing** layer.

## Out of scope (tracked elsewhere)

- **#13** Mail list formatter / MCP payload shape.
- **#15** Calendar disambiguation in control plane (may proceed in parallel once persona/routing does not **default governance**).
- Pure visual redesign of tiles/modals (**after** identity + fallback authority is defined).

---

## Suggested acceptance criteria

- [ ] Changing **System Configuration** fields used for runtime identity updates **the next** voice/chat `systemInstruction` (or user sees a clear “not applied” state).
- [ ] **Agent intent** default does not **encode** a governance-only mission when the user configures a non-governance operator profile (split defaults, or single merged “mission” field with clear semantics).
- [ ] Repro: user asks for **email today** → assistant either emits **`workspace.mail.*`** / opens Workspace with **INTENT_JSON**, or **asks a clarifying question** — **does not** only offer governance document review as the primary follow-up.
- [ ] Document **authoritative binding** (where profile lives: memory, `localStorage`, future API) in code comments or `WORKSPACE.md` / operator doc.

---

## Priority vs Workspace pilot stack

**Recommended order (updated):**

1. **This issue** — session identity + fallback authority (blocker for trustworthy **#15** / **#13** UX).
2. **#14** — live verification and close if auth/readiness is consistent.
3. **#15** — calendar disambiguation (CP-level).
4. **#13** — mail payload/formatter.
5. Chat ↔ governed surface handoff and **launcher/dashboard** UX reduction.

Parent context: **#12** pilot — [`artifacts/workspace-control-plane-call-graph.md`](artifacts/workspace-control-plane-call-graph.md).
