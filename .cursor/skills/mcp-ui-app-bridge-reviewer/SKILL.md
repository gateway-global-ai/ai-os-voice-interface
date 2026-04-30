---
name: mcp-ui-app-bridge-reviewer
description: Reviews MCP UI, MCP Apps, App Bridge, and example app integrations against primary docs and local UI code. Use for MCP UI checks, App Bridge compatibility, resource rendering review, or embedded app plans.
---

# MCP UI App Bridge Reviewer

## Trigger Scenarios

Use for MCP UI resource review, App Bridge API review, MCP Apps example comparison, embedded UI compatibility, or `/mcp-ui-check` workflows.

## Required Sources

- Cursor skills: https://cursor.sh/docs/skills
- MCP Apps: https://modelcontextprotocol.io/extensions/apps/overview
- MCP UI: https://github.com/MCP-UI-Org/mcp-ui
- App Bridge API: https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html
- Basic Server React: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react
- Basic Server Svelte: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-svelte
- Transcript Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/transcript-server
- Video Resource Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/video-resource-server
- Say Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/say-server
- QR Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/qr-server
- Map Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/map-server

## No-Mock Gate

No fake browser evidence, simulated screenshots, placeholder app output, or unsupported API claims. Mark absent apps, unreachable docs, or unavailable browsers `blocked` or `unverified`.

## May Change

- Review reports, compatibility matrices, operating prompts, and task plans.

## May Not Change

- UI runtime code, lesson artifacts, generated screenshots, or publish/completion states unless explicitly requested and verified.

## Workflow

1. Identify applicable MCP UI/App Bridge docs and local files.
2. Compare claims to primary docs and examples.
3. Run real checks only when the app/test target exists.
4. Report compatibility, gaps, and blocked evidence.

## Output Contract

Return `sources_checked`, `local_paths`, `checks_run`, `compatibility_findings`, `no_mock_gate`, and `remaining_unverified`.

## AI OS Tier B shell pilot (repo)

When reviewing or extending the in-repo MCP Apps host:

- Primary docs: [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview), [MCP UI](https://github.com/MCP-UI-Org/mcp-ui), [App Bridge](https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html), [Cursor skills](https://cursor.sh/docs/skills).
- Host: `src/components/shell/McpShellSurface.tsx` (`AppRenderer`, `StreamableHTTPClientTransport`, `onFallbackRequest` for `x/aios/shell_action`).
- Pilot server: `server/mcpShellPilotServer.ts`, HTML + theme injection: `server/mcpShellPilot/htmlUi.ts`, `server/mcpShellPilot/mcpShellThemeCss.ts`.
- Browser token snapshot (optional generator): `src/shell/mcpShellThemeSnapshot.ts`.
- Dev: `npm run dev:web+mcp`; production build still bundles sandbox via `npm run build:mcp-sandbox`.
