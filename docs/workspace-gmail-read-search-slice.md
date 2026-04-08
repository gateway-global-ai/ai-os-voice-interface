# Gmail read / search slice — Phase 1 Workspace

This document defines the **next governed Workplace slice** after calendar read: **Gmail search + message read** using the same control-plane → adapter → audit pattern as [`workspace.calendar.list`](./workspace-calendar-read-qa.md).

**Status:** `workspace.mail.search` and **`workspace.mail.read`** are wired on `workspace_mail_hub`: loader in [`loadWorkspacePayload.ts`](../src/shellCanvas/loadWorkspacePayload.ts) (search on every load; read when `mailMessageId` is passed), UI in [`WorkspaceHubSurface.tsx`](../src/overlays/WorkspaceHubSurface.tsx) (`mode: 'mail'`, one primary panel: read when active, else search + “Read one message” id field). `resource_ref.id` flows envelope → control plane → adapter `args`.

## Governance alignment

| Document | Relevance |
|----------|-----------|
| **AIOS-SPEC-007** | Integration control plane, MCP adapter, no client bypass |
| **AIOS-SPEC-008** §5–9 | Known-intent onboarding, dependencies, integration readiness |
| **[pre-workplace-checklist.md](./pre-workplace-checklist.md)** | Tracks A–C for merge/production readiness |

PRs implementing this slice should cite SPEC-007, SPEC-008 §5–9, and record QA results from **[workspace-gmail-read-qa.md](./workspace-gmail-read-qa.md)**.

---

## Intents (Phase 1 read plane)

| Intent | Purpose | Resolved scope class |
|--------|---------|----------------------|
| `workspace.mail.search` | Search or list messages (query semantics defined by MCP tool) | `workspace.google.read` |
| `workspace.mail.read` | Read a single message body/metadata | `workspace.google.read` |

Both MUST remain in `PHASE_1_WORKSPACE_INTENTS` and MUST map through `runWorkspaceControlPlane` → `callWorkspaceMcpAdapter` only.

---

## End-to-end flow (target)

```
INTENT_JSON / hub navigation
  → workspaceIntentToCanvasView (mail intents → workspace_mail_hub)
  → loadGovernancePayload('workspace_mail_hub', …)
  → runWorkspaceControlPlane(envelope)
  → callWorkspaceMcpAdapter({ tool: envelope.intent, args })
  → JSON-RPC tools/call with params.name = intent string
  → GovernanceWorkspaceMailHubPayload
  → WorkspaceHubSurface (mode: mail) or equivalent
```

Mirror the calendar reference:

```text
workspace_calendar_hub
  → runWorkspaceControlPlane
  → callWorkspaceMcpAdapter
  → WorkspaceHubSurface (mode: calendar)
```

---

## MCP contract (unchanged)

- **POST** `{VITE_WORKSPACE_MCP_URL}{VITE_WORKSPACE_MCP_JSONRPC_PATH}` (default path `/mcp`)
- **JSON-RPC** `method: "tools/call"`
- **`params.name`** = governed intent string (`workspace.mail.search` or `workspace.mail.read`)
- Server registers tools under those names (or proxies them)

See [WORKSPACE.md](../WORKSPACE.md).

---

## Routing envelope

Reuse [`WorkspaceRoutingEnvelope`](../src/workspace/types.ts):

- **`intent`:** `workspace.mail.search` or `workspace.mail.read`
- **`policy_context.scope_class`:** MUST equal `resolveScopeClass(intent)` → `workspace.google.read`
- **`resource_ref`:** Use **only** for **entity references** (e.g. message id for read). For `workspace.mail.read`, set `type` / `id` (or equivalent) per MCP contract so the adapter can map them into tool `args`.

Do **not** add parallel `fetch` to the MCP origin from React surfaces.

### Search input contract (normative)

For **`workspace.mail.search`**, all search / list input MUST reach the MCP tool via **adapter `args`**, not via `resource_ref` (a query string is not a resource).

**Contract:**

```text
workspace.mail.search → tool args include: { query: string }
```

- `query` may be empty for a default listing behavior if the MCP tool defines one.
- The control plane / payload loader MAY extend the envelope or a narrow internal bridge so this maps into `callWorkspaceMcpAdapter({ args: { …, query } })` in **one** place (same choke point as today’s `resource_ref` + `session_id` forwarding).

**Rule:** `resource_ref` MUST NOT carry free-text search queries.

---

## Hub payload shape

Target union member (names illustrative until implemented):

```ts
// Illustrative — align with GovernanceWorkspaceCalendarHubPayload style
GovernanceWorkspaceMailHubPayload = {
  view: 'workspace_mail_hub'
  phase: 1
  specRef: 'AIOS-SPEC-007'
  mailSearch?: GovernanceWorkspaceMailResult   // same fields family as calendarRead
  mailRead?: GovernanceWorkspaceMailResult
}
```

**UI rule (MVP):** Only **one primary mode** is active at a time on the surface—for example, either the search-result panel **or** the single-message read panel is emphasized; avoid implying both are “primary” without explicit layout. A future split into `workspace_mail_search_hub` vs a dedicated read view is allowed if the surface grows; not required for Phase 1.

---

## First action after onboarding (SPEC-008)

Per **AIOS-SPEC-008** (onboarding → execution → value), when the user completes Workspace connection and lands on a **value path**, the system **SHOULD** trigger an appropriate **read-plane** intent so the first screen shows real utility, not a dead end:

| Entry path (example) | Suggested first executed read intent |
|------------------------|--------------------------------------|
| User opens **Mail** hub / tile | `workspace.mail.search` (default `query` per contract above) |
| User opens **Calendar** hub / tile | `workspace.calendar.list` (existing) |
| User opens generic **Workspace** hub only | May show tiles without an automatic MCP call until the user picks Mail or Calendar |

Exact wiring (which navigation sets which `loadData` view) is product-controlled; the invariant is **onboarding completes → next step runs a governed read slice**, not a bypass.

---

## Implementation surface (current)

| Area | Status |
|------|--------|
| **`canvasTypes.ts` / router / policy** | `workspace_mail_hub` registered; mail intents → same canvas. |
| **`loadGovernancePayload.ts`** | Search on every mail hub load; **read** when `params.mailMessageId` set (`resource_ref: { type: 'message', id }`). |
| **`GovernanceCanvasContext.tsx` / `canvasTransitions.ts` / `buildGovernanceCanvasState`** | `loadData(..., { mailMessageId })` passes through to payload loader. |
| **`WorkspaceHubSurface.tsx`** | `mode: 'mail'`: search JSON + **Read one message** id field; read panel primary when `mailRead` present; search JSON behind `<details>` while reading. |
| **Heuristics** | `workspaceMailDataIsEmpty` (search lists); `workspaceMailReadDataIsEmpty` (single message body). |

---

## UI states (must match reality)

Same bar as calendar:

| State | User-visible behavior |
|-------|------------------------|
| **not_configured** | `VITE_WORKSPACE_MCP_URL` unset; no fake Gmail data |
| **Loading** | In-flight control plane / adapter |
| **Error** | Transport/auth/timeout with message; not shown as empty |
| **Empty** | Valid response with zero messages only |
| **OK** | Structured preview or list |

---

## Verification

- **[workspace-gmail-read-qa.md](./workspace-gmail-read-qa.md)** — manual QA checklist (parallel to calendar).
- **Grep:** `callWorkspaceMcpAdapter` only via control plane; no new bypass paths.

---

## Related

- [workspace-calendar-read-qa.md](./workspace-calendar-read-qa.md) — reference QA pattern
- [WORKSPACE.md](../WORKSPACE.md) — env vars and adapter overview
- [IntentDiscoveryOnboardingFramework.md](../governing_docs/specifications/IntentDiscoveryOnboardingFramework.md) — AIOS-SPEC-008
