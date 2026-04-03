# QA checklist — Phase 1 Workspace calendar read

Use this for the first governed Workspace MCP slice (`workspace.calendar.list` → calendar hub).

## Flow under test

```
workspace_calendar_hub
  → runWorkspaceControlPlane
  → callWorkspaceMcpAdapter
  → MCP tools/call
  → GovernanceWorkspaceCalendarRead
  → WorkspaceHubSurface
```

---

## 1. Preconditions

Before testing, confirm:

| Check | Notes |
|-------|--------|
| **Branch** | e.g. `feature/workspace-mcp-governance` (or your working branch) |
| **Build** | `npm run build` exits **0** |
| **Workspace MCP server** | Intentionally unavailable for failure tests, or reachable for happy-path tests |
| **Env** | `VITE_WORKSPACE_MCP_URL` as needed; optional `VITE_WORKSPACE_MCP_JSONRPC_PATH`, `VITE_WORKSPACE_MCP_TIMEOUT_MS` |

---

## 2. Acceptance criteria summary

The slice **passes** when all of the following are true:

- [ ] No direct MCP calls from UI components — all execution goes **control plane → adapter**.
- [ ] UI shows explicit states: **`not_configured`**, **`error`**, **`empty`**, **`ok`** (see §4).
- [ ] Adapter failure codes are preserved on the payload (`adapterCode` where applicable).
- [ ] Policy denial happens **before** network when exercised (see TC-09).
- [ ] Audit events exist for success and failure (`workspace_control_plane` / `logWorkspaceAudit`).
- [ ] No silent fallback to generic chat or fake success.
- [ ] **`npm run build`** stays green.

Implementation references: `src/workspace/integrationControlPlane.ts`, `src/workspace/mcpAdapter.ts`, `src/governance/loadGovernancePayload.ts` (`workspace_calendar_hub`), `src/overlays/WorkspaceHubSurface.tsx`.

---

## 3. Test cases

### TC-01 — Build integrity

**Purpose:** Verify the branch is stable before runtime testing.

| Step | Command / action |
|------|------------------|
| 1 | `npm run build` |

| Pass | Fail |
|------|------|
| Exit code **0**; no type or missing-import errors | Any build error |

---

### TC-02 — Missing MCP configuration

**Purpose:** Explicit `not_configured` when MCP URL is absent.

| Setup | Unset `VITE_WORKSPACE_MCP_URL` (restart dev server after change). |
|-------|----------------------------------------|
| Steps | Open **Governance → Google Workspace → Calendar (read plane)** (loads `workspace_calendar_hub` and runs the calendar read path). |

| Expected control plane | `adapter.ok === false`, `adapterCode === "not_configured"`. |
| Expected UI | **Not configured** panel; explicit copy; **not** a fake empty list; **not** generic success. |
| Expected audit | Failure path after policy allow: `failure_mode` / adapter not_configured (see `integrationControlPlane` + `logWorkspaceAudit`). |

| Pass | Fail |
|------|------|
| Explicit not-configured state; no network required to a real MCP | Blank screen; empty state instead; uncaught exception |

---

### TC-03 — Happy path / valid calendar read

**Purpose:** Full governed success path.

| Setup | Valid `VITE_WORKSPACE_MCP_URL`, optional path; reachable MCP; server accepts `tools/call` for tool name **`workspace.calendar.list`**; valid auth on server if required. |
|-------|----------------------------------------|
| Steps | Open `workspace_calendar_hub` (calendar read runs on load). |

| Expected adapter request | `POST` to `{VITE_WORKSPACE_MCP_URL}{VITE_WORKSPACE_MCP_JSONRPC_PATH or /mcp}`; JSON-RPC `method: "tools/call"`; **`params.name` = `workspace.calendar.list`**. |
| Expected control plane | `adapter.ok === true`; parsed `data`; success audit with **`outcome: adapter_success`** in detail (after allow). |
| Expected UI | `calendarRead.loadState === "ok"`; JSON preview (or structured UI later); no error banner for this path. |
| Expected audit | Allow + success audit with intent and audit id. |

| Pass | Fail |
|------|------|
| Real data visible; success auditable | Data returned but UI shows error; success without audit; any bypass around control plane |

---

### TC-04 — Unreachable MCP host

**Purpose:** Network failure handling.

| Setup | MCP URL points to invalid host or server stopped. |
|-------|----------------------------------------|
| Steps | Open `workspace_calendar_hub`. |

| Expected control plane | `adapter.ok === false`; **`adapterCode === "http_error"`** (or timeout if the stack hangs until abort — prefer unreachable host that fails fast). |
| Expected UI | **Error** state; message indicates failure; **not** shown as empty. |
| Expected audit | Failure audit with `failure_mode` consistent with adapter code. |

| Pass | Fail |
|------|------|
| Visible error; no uncaught rejection | Hang forever; empty state; crash |

---

### TC-05 — Timeout handling

**Purpose:** Timeout / abort behavior.

| Setup | `VITE_WORKSPACE_MCP_TIMEOUT_MS=500` (or very low) and MCP that delays longer than that. |
|-------|----------------------------------------|
| Steps | Open `workspace_calendar_hub`. |

| Expected control plane | `adapter.ok === false`; **`adapterCode === "timeout"`**. |
| Expected UI | **Error** state; timeout-style message; loading does not spin forever. |
| Expected audit | Timeout failure logged. |

| Pass | Fail |
|------|------|
| Request aborts; timeout classified; UI leaves loading | Hangs; silent failure; no audit |

---

### TC-06 — Auth failure

**Purpose:** HTTP 401/403 mapping.

| Setup | MCP returns **401** or **403** (invalid bearer on server, or server rejects auth). |
|-------|----------------------------------------|
| Steps | Open `workspace_calendar_hub`. |

| Expected control plane | `adapter.ok === false`; **`adapterCode === "auth_error"`**. |
| Expected UI | **Error** state; distinguishable from generic network (adapter line shows `auth_error`). |
| Expected audit | Auth-class failure logged. |

| Pass | Fail |
|------|------|
| Auth errors distinguishable from empty / generic network | Auth shown as empty; uncaught throw; mislabeled as success |

---

### TC-07 — Malformed MCP response

**Purpose:** Safe handling of bad payload shape.

| Setup | MCP returns invalid JSON, or JSON-RPC without usable `result`, or `content` shape the extractor cannot parse. |
|-------|----------------------------------------|
| Steps | Trigger read. |

| Expected control plane | `adapter.ok === false`; today typically **`adapterCode === "http_error"`** (or not_configured only if URL missing). No dedicated **`malformed_response`** code yet — optional follow-up. |
| Expected UI | **Error** state; no crash; no fake success/empty. |
| Expected audit | Failure logged under current classification. |

| Pass | Fail |
|------|------|
| No uncaught exception; safe surfaced error | Crash; broken render; silent fallback |

---

### TC-08 — Empty but valid result

**Purpose:** Truthful empty state.

| Setup | Valid `tools/call` response that parses to an **empty** calendar list per `workspaceCalendarDataIsEmpty()` in `loadGovernancePayload.ts` (e.g. empty `calendars` / `items` / `events` / `eventList`). |
|-------|----------------------------------------|
| Steps | Trigger read. |

| Expected control plane | `adapter.ok === true`; empty heuristic → `calendarRead.loadState === "empty"`. |
| Expected UI | **Empty** state copy; **not** error; **not** ok with fake rows. |
| Expected audit | Success path (`adapter_success`); no adapter failure code. |

| Pass | Fail |
|------|------|
| Empty only on valid empty data | Empty shown as error, or error as empty |

---

### TC-09 — Policy denial before network

**Purpose:** No `callWorkspaceMcpAdapter` when policy denies.

| Setup | **Not exposed in default UI** — production envelope from `loadGovernancePayload` is valid Phase 1 read. To test denial: call `runWorkspaceControlPlane` with invalid envelope (e.g. non–Phase-1 intent, or `policy_context.scope_class` mismatch), or add a dev-only harness. |
|-------|----------------------------------------|

| Expected control plane | Denial **before** adapter; **`runWorkspaceControlPlane` returns** `ok: false`, `code: 'policy_denied'` or `'invalid_intent'`. |
| Expected UI | N/A for default hub unless you wire a test entry point — verify in harness. |
| Expected audit | **`policy_decision: 'deny'`** with reason; **no** MCP request. |

| Pass | Fail |
|------|------|
| No network when denied; denial audited | Adapter still called; silent no-op; denial not audited |

---

### TC-10 — No direct MCP bypass

**Purpose:** Architecture discipline.

| Steps | Run: |

```bash
rg "callWorkspaceMcpAdapter" src/
rg "VITE_WORKSPACE_MCP_URL" src/
```

Review **`fetch(`** usage in overlays/components: Workspace surfaces must not call the MCP origin directly; MCP traffic goes through **integration control plane → `mcpAdapter`**.

| Pass | Fail |
|------|------|
| `callWorkspaceMcpAdapter` only from approved path(s); env read at adapter/config boundary | Overlay or component reaches MCP URL without control plane |

---

## 4. Expected UI states (`workspace_calendar_hub`)

| State | What the user should see |
|-------|---------------------------|
| **Not configured** | Clear “configure `VITE_WORKSPACE_MCP_URL`” / MCP not configured message; **not** empty-list copy; **not** fake data. |
| **Loading** | Loading indicator while `loadGovernancePayload` runs; no stale success data unless you intentionally keep it (default: fresh load). |
| **Error** | Failure copy; optional retry from parent (`dataError` / retry patterns); **not** empty-only copy for transport failures. |
| **Empty** | “No calendars / no data” style message **only** when response is valid and heuristically empty. |
| **OK** | JSON preview of returned payload (or structured list in a future iteration). |

---

## 5. Expected audit fields

Audits go through **`logWorkspaceAudit`** → **`logGovernanceAudit('workspace_control_plane', { subsystem: 'google_workspace', ... })`**. Exact JSON shape depends on logger; each path should leave evidence including:

- Intent id (`workspace.calendar.list`)
- Scope class (`workspace.google.read` when resolved)
- Policy decision (allow / deny)
- Adapter outcome on success (`detail.outcome: 'adapter_success'`) or **`failure_mode`** / message on failure
- **`adapterCode`** on adapter failures (surfaced via control plane result)
- Correlation **`auditId`**

Illustrative examples (fields may be nested under `detail` in your logger):

**Success (illustrative)**

```json
{
  "intent": "workspace.calendar.list",
  "scope_class": "workspace.google.read",
  "policy_decision": "allow",
  "detail": { "outcome": "adapter_success", "auditId": "…" }
}
```

**Failure (illustrative)**

```json
{
  "intent": "workspace.calendar.list",
  "scope_class": "workspace.google.read",
  "policy_decision": "allow",
  "failure_mode": "timeout",
  "detail": { "message": "…", "auditId": "…" }
}
```

**Denial (illustrative)**

```json
{
  "intent": "workspace.calendar.list",
  "policy_decision": "deny",
  "detail": { "reason": "…", "auditId": "…" }
}
```

---

## 6. Final pass criteria

The calendar-read slice is **accepted** when:

- TC-01 through TC-10 pass (TC-09 may be **N/A** for UI-only manual runs if no denial harness).
- Build stays green.
- No direct MCP bypass.
- No silent fallback.
- Success and failure are both auditable.
- UI state matches the real outcome in every tested case.

Broader production readiness: **[pre-workplace-checklist.md](./pre-workplace-checklist.md)**.

---

## 7. Test result template

Copy per run:

```markdown
## Workspace calendar read QA

- Branch: 
- Commit: 
- MCP URL configured: yes/no
- Date: YYYY-MM-DD

| Test case | Result | Notes |
|-----------|--------|-------|
| TC-01 Build integrity | Pass/Fail | |
| TC-02 Missing config | Pass/Fail | |
| TC-03 Happy path | Pass/Fail | |
| TC-04 Unreachable host | Pass/Fail | |
| TC-05 Timeout | Pass/Fail | |
| TC-06 Auth failure | Pass/Fail | |
| TC-07 Malformed response | Pass/Fail | |
| TC-08 Empty result | Pass/Fail | |
| TC-09 Policy denial | Pass/Fail / N/A | |
| TC-10 No direct bypass | Pass/Fail | |

### Overall
Pass / Fail

### Blocking issues
- 

### Non-blocking notes
- 
```

---

## Related

- [WORKSPACE.md](../WORKSPACE.md) — env vars, MCP HTTP contract
- [pre-workplace-checklist.md](./pre-workplace-checklist.md) — pre-production gate
