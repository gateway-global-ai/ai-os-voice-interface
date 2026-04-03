# Google Workspace integration (governed)

This app implements **AIOS-SPEC-007** (`governing_docs/specifications/GoogleWorkspaceIntegrationGovernance.md`): intents route through the **Workspace Intent Router → Integration Control Plane → MCP Adapter**; the voice/agent layer does **not** call Google Workspace MCP tools directly.

## Phase 1

- **Read plane** intents only (`src/workspace/intentRegistry.ts`).
- **Layer 2 → Layer 1:** each intent maps to exactly one `workspace.google.*` scope class (`src/workspace/scopeClasses.ts`).
- UI shells: `workspace_hub`, `workspace_calendar_hub` (canvases in `src/overlays/WorkspaceHubSurface.tsx`).

## Configuration

| Variable | Purpose |
|----------|---------|
| `VITE_WORKSPACE_MCP_URL` | Base URL of the external Google Workspace MCP server (streamable HTTP). If unset, the MCP adapter returns `not_configured`. |

## Deployment (recommended)

- Streamable HTTP, OAuth 2.1 multi-user mode, stateless hosting where applicable.
- Do **not** use `--single-user` for production central hosting (see SPEC-007).

## Related documents

- Amendment: `governing_docs/amendments/AMD-2026-006.md`
- AIP workspace intents: `AIOS-SPEC-003` §11
- UI surfaces: `AIOS-SPEC-006` §13
