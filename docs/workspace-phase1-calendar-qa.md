# Phase 1 — Calendar read QA matrix

Manual verification for **`workspace.calendar.list`** through **`runWorkspaceControlPlane` → `callWorkspaceMcpAdapter`** → calendar hub UI.

**Prerequisites:** Dev server running; open **Governance → Google Workspace → Calendar (read plane)** (or intent `workspace.calendar.list` / canvas `workspace_calendar_hub`).

Audit events use subsystem `google_workspace` and type `workspace_control_plane` (see `logWorkspaceAudit` → `governanceAudit`).

---

## Matrix (expected outcomes)

| # | Scenario | Setup | Expected UI (`WorkspaceHubSurface` / `calendarRead`) | Expected `adapterCode` (if error path) | Audit notes |
|---|----------|--------|------------------------------------------------------|------------------------------------------|-------------|
| 1 | **Happy path** | `VITE_WORKSPACE_MCP_URL` points at a live MCP; tool `workspace.calendar.list` returns JSON in `tools/call` result | `loadState: ok`, JSON preview of data | — | Allow before MCP; **`outcome: adapter_success`** after success; optional failure audits on error paths only |
| 2 | **Missing config** | Unset `VITE_WORKSPACE_MCP_URL` (restart dev server after change) | `not_configured` panel | `not_configured` | Allow then failure audit with **`failure_mode: not_configured`** |
| 3 | **Unreachable / bad host** | URL host does not listen or invalid host | `error` panel, message mentions fetch/network | `http_error` | **`failure_mode: http_error`** (or timeout if hang) |
| 4 | **Timeout** | Set `VITE_WORKSPACE_MCP_TIMEOUT_MS=500` and use an MCP that delays >500ms | `error`, message mentions timeout/aborted | `timeout` | **`failure_mode: timeout`** |
| 5 | **Auth failure** | MCP returns HTTP **401** or **403** | `error`, adapter line shows **`auth_error`** | `auth_error` | **`failure_mode: auth_error`** |
| 6 | **Empty result** | MCP returns success with empty `calendars` / `items` / `events` / `eventList` (see `workspaceCalendarDataIsEmpty` in `loadGovernancePayload.ts`) | `empty` (not `error`) | — | Success path: **`adapter_success`** |
| 7 | **Policy denial (no network)** | Not exposed in UI yet — envelope must fail `canExecuteScopeClass` or `validateEnvelope` | Would not reach adapter | — | **`policy_decision: deny`** with reason; **no** MCP request |

For **#7**, today’s UI always uses a valid Phase 1 envelope from `loadGovernancePayload` (read scope, founder mode). To test policy denial in code, temporarily call `runWorkspaceControlPlane` with a **non–Phase-1 intent** or mismatched `policy_context.scope_class`, or add a dev-only test harness — not required for default manual QA.

---

## Quick grep checks (no bypass)

```bash
rg "callWorkspaceMcpAdapter" src/
rg "fetch\\(.*VITE_WORKSPACE_MCP" src/
```

Adapter should only be invoked from `integrationControlPlane` / `mcpAdapter`.

---

## Optional follow-ups (not blocking)

- Add **`malformed_response`** adapter code when JSON-RPC body parses but `result` is unusable (today: **`http_error`**).
- Replace JSON preview with structured calendar rows after this matrix passes.
- Split **intent id** vs **MCP tool name** when the server contract stabilizes.

---

## Related

- [WORKSPACE.md](../WORKSPACE.md) — env vars and MCP HTTP contract
- [pre-workplace-checklist.md](./pre-workplace-checklist.md) — production readiness gate
