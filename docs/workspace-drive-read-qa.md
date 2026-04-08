# QA checklist — Phase 1 Workspace Drive read (list / search)

This document verifies **operational correctness** of the Drive read-plane slice and supports **[pre-workplace-checklist.md](./pre-workplace-checklist.md)** (Track C — no MCP bypass).

**Intents under test:** `workspace.drive.list` (default hub load), `workspace.drive.search`, and routing for `workspace.drive.read` (single-file path when implemented on the hub).

## Usage

Execute and record this checklist for any PR that:

- implements or modifies Drive MCP read-plane behavior, or
- changes the adapter, integration control plane, `workspace_drive_hub` payload path, or `WorkspaceHubSurface` drive mode.

## Flow under test

```
workspace_drive_hub
  → runWorkspaceControlPlane
  → callWorkspaceMcpAdapter (tool: search_drive_files for list/search)
  → GovernanceWorkspaceDriveHubPayload
  → WorkspaceHubSurface (mode: drive)
```

---

## 1. Preconditions

| Check | Notes |
|-------|--------|
| **Branch** | Feature branch touching Workspace Drive |
| **Build** | `npm run build` exits **0** |
| **Workspace MCP** | Reachable for happy path, or unavailable for failure tests |
| **Env** | `VITE_WORKSPACE_MCP_URL`; optional `VITE_WORKSPACE_MCP_JSONRPC_PATH`, `VITE_WORKSPACE_MCP_TIMEOUT_MS` |

---

## 2. Acceptance criteria summary

The slice **passes** when all of the following are true:

- [ ] No direct MCP calls from UI — execution goes **control plane → adapter** only.
- [ ] UI shows explicit states: **`not_configured`**, **`error`**, **`empty`**, **`ok`**.
- [ ] Adapter failure codes preserved (`adapterCode` where applicable).
- [ ] Audit events for success and failure (`logWorkspaceAudit` via control plane).
- [ ] No silent fallback to fake file lists.
- [ ] **`npm run build`** stays green.

---

## 3. Test cases

### TC-01 — Build integrity

| Step | Command |
|------|---------|
| 1 | `npm run build` |
| 2 | `npm run lint` |
| 3 | `npm test` |

**Pass:** All exit **0**.

---

### TC-02 — Missing MCP configuration

| Setup | Unset `VITE_WORKSPACE_MCP_URL` (restart dev server). |
|-------|------------------------------------------------------|
| Steps | Open governed **Workspace → Drive** (`workspace_drive_hub`). |

| Expected | `toolRead.loadState === 'not_configured'`; **Workspace MCP not ready** callout. |
|----------|----------------------------------------------------------------------------------|

---

### TC-03 — Happy path / default list

| Setup | Valid MCP URL; Google sign-in or dev bearer as required by your environment. |
|-------|-------------------------------------------------------------------------------|
| Steps | Open `workspace_drive_hub`. |

| Expected | `toolRead.loadState === 'ok'` or `'empty'`; data from MCP; no uncaught errors. |
|----------|--------------------------------------------------------------------------------|
| Adapter | `tools/call` **`params.name`** = **`search_drive_files`** (intent `workspace.drive.list` resolves to this tool in [`mcpIntentToolMap.ts`](../src/workspace/mcpIntentToolMap.ts)). |

---

### TC-04 — Empty result

| Setup | MCP returns a valid payload with empty `files` (or shape matching [`workspaceDriveListDataIsEmpty`](../src/workspace/driveListEmpty.ts)). |
|-------|----------------------------------------------------------------------------------------------------------------------------------------------|
| Expected | `toolRead.loadState === 'empty'`; **No results** copy; not `error`. |

---

### TC-05 — Voice / intent routing

| Steps | Emit JSON intent `workspace.drive.list` or `workspace.drive.search` (with query) per app contract. |
|-------|------------------------------------------------------------------------------------------------------|
| Expected | Canvas resolves to **`workspace_drive_hub`**; no phrase-based routing in production paths. |

---

## 4. PR template (optional)

| Area | Result |
|------|--------|
| TC-01 Build | pass / fail |
| TC-02 not_configured | pass / fail |
| TC-03 happy path | pass / fail |
| TC-04 empty | pass / fail |
| TC-05 intent routing | pass / fail |
| **Overall** | pass / fail |

**Blocking issues:** (none / list)

---

## 5. Implementation references

[`loadWorkspacePayload.ts`](../src/shellCanvas/loadWorkspacePayload.ts) · [`integrationControlPlane.ts`](../src/workspace/integrationControlPlane.ts) · [`mcpAdapter.ts`](../src/workspace/mcpAdapter.ts) · [`WorkspaceHubSurface.tsx`](../src/overlays/WorkspaceHubSurface.tsx) · [`workspace-drive-read-slice.md`](./workspace-drive-read-slice.md)
