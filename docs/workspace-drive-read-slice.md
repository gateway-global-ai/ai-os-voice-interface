# Google Drive read slice — Phase 1 Workspace

This document defines the **governed Drive read-plane** slice: **list / search** via MCP, aligned with **[workspace-calendar-read-qa.md](./workspace-calendar-read-qa.md)** and **[workspace-gmail-read-search-slice.md](./workspace-gmail-read-search-slice.md)**.

**Status:** `workspace_drive_hub` loads **`workspace.drive.list`** on every hub open (maps to MCP tool `search_drive_files` with empty query — default list behavior per server). **`workspace.drive.search`** carries a non-empty query; **`workspace.drive.read`** is reserved for single-file content (`get_drive_file_content`) when the loader gains a `resource_ref` / route param (not required for Phase 1 hub list).

## Governance alignment

| Document | Relevance |
|----------|-----------|
| **AIOS-SPEC-007** | Integration control plane, MCP adapter, no UI bypass |
| **[pre-workplace-checklist.md](./pre-workplace-checklist.md)** | Track C — no MCP bypass |

PRs touching this slice should record QA from **[workspace-drive-read-qa.md](./workspace-drive-read-qa.md)**.

---

## Intents (Phase 1 read plane)

| Intent | Purpose | Scope class | MCP tool (adapter) |
|--------|---------|--------------|---------------------|
| `workspace.drive.list` | Default hub load — list / default search window | `workspace.google.read` | `search_drive_files` |
| `workspace.drive.search` | Query-shaped search | `workspace.google.read` | `search_drive_files` |
| `workspace.drive.read` | Single file metadata/content (id via `resource_ref`) | `workspace.google.read` | `get_drive_file_content` |

**Out of scope for this slice:** upload, delete, share, move, batch writes.

---

## End-to-end flow

```
INTENT_JSON / hub navigation
  → workspaceIntentToCanvasView (drive intents → workspace_drive_hub)
  → loadGovernancePayload('workspace_drive_hub', …)
  → runWorkspaceControlPlane(envelope)
  → resolveMcpToolFromIntent → callWorkspaceMcpAdapter({ tool: 'search_drive_files', args })
  → GovernanceWorkspaceDriveHubPayload (toolRead)
  → WorkspaceHubSurface (mode: drive)
```

---

## Loader and empty detection

- **Default intent on load:** `workspace.drive.list` with `query: ''`.
- **Empty heuristic:** [`workspaceDriveListDataIsEmpty`](../src/workspace/driveListEmpty.ts) — permissive over `{ files: [] }`, nested `data.files`, `fileList`, `items`.

---

## UI

- **States:** `not_configured`, `error`, `empty`, `ok` via `GovernanceWorkspaceToolRead` and `WorkspaceToolReadPanel`.
- **Success:** generic row list when `extractMcpRowArray` finds `files` / `items` / etc.; otherwise structured JSON under operator disclosure (same pattern as Contacts search hub).

---

## References

Implementation: [`loadWorkspacePayload.ts`](../src/shellCanvas/loadWorkspacePayload.ts) (`workspace_drive_hub`), [`mcpIntentToolMap.ts`](../src/workspace/mcpIntentToolMap.ts), [`WorkspaceHubSurface.tsx`](../src/overlays/WorkspaceHubSurface.tsx) (`mode: 'drive'`).
