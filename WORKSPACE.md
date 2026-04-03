# Google Workspace integration (governed)

This app implements **AIOS-SPEC-007** (`governing_docs/specifications/GoogleWorkspaceIntegrationGovernance.md`): intents route through the **Workspace Intent Router → Integration Control Plane → MCP Adapter**; the voice/agent layer does **not** call Google Workspace MCP tools directly.

## MCP adapter (HTTP)

The browser calls **`runWorkspaceControlPlane` → `callWorkspaceMcpAdapter`** only. The adapter sends **JSON-RPC 2.0** `POST` to `{VITE_WORKSPACE_MCP_URL}{VITE_WORKSPACE_MCP_JSONRPC_PATH}` with `method: "tools/call"` and `params.name` set to the **intent string** (e.g. `workspace.calendar.list`). The Workspace MCP server must register a tool under that name (or proxy it).

## Phase 1

- **Read plane** intents only (`src/workspace/intentRegistry.ts`).
- **Layer 2 → Layer 1:** each intent maps to exactly one `workspace.google.*` scope class (`src/workspace/scopeClasses.ts`).
- UI shells: `workspace_hub`, `workspace_calendar_hub` (canvases in `src/overlays/WorkspaceHubSurface.tsx`).

## Configuration

| Variable | Purpose |
|----------|---------|
| `VITE_WORKSPACE_MCP_URL` | Base URL of the external Google Workspace MCP server. If unset, the MCP adapter returns `not_configured`. |
| `VITE_WORKSPACE_MCP_JSONRPC_PATH` | Optional. Path for JSON-RPC `POST` (default `/mcp`). The adapter sends `tools/call` for intents such as `workspace.calendar.list`. |
| `VITE_WORKSPACE_MCP_TIMEOUT_MS` | Optional. Request timeout in ms (default `30000`). |

## Deployment (recommended)

- Streamable HTTP, OAuth 2.1 multi-user mode, stateless hosting where applicable.
- Do **not** use `--single-user` for production central hosting (see SPEC-007).

## Pre–Workplace Phase 1 gate

Before calling Workplace integration **live** or **production-ready**, satisfy **[docs/pre-workplace-checklist.md](docs/pre-workplace-checklist.md)** (secret boundary, structured intent routing, no MCP bypasses).

## Phase 1 calendar read — QA

Manual QA for the first governed read path: **[docs/workspace-calendar-read-qa.md](docs/workspace-calendar-read-qa.md)**.

## Related documents

- Amendment: `governing_docs/amendments/AMD-2026-006.md`
- AIP workspace intents: `AIOS-SPEC-003` §11
- UI surfaces: `AIOS-SPEC-006` §13
