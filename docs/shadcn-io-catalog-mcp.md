# shadcn-io catalog MCP (design-time only)

**Status:** documented, not vendored — update this line to **fully vendored** once `scripts/shadcn-io-catalog-mcp.ts` and the catalog JSON live in this repo and Cursor MCP is wired.

This describes a **Gateway-maintained stdio MCP** that serves a **repo-local JSON catalog** of [shadcn.io](https://ui.shadcn.com)–style entries. It is meant for **Cursor and other local tooling**, not for the live voice/browser runtime.

This MCP is **authoritative only for design-time component discovery in Cursor** and **must not** be referenced as a runtime dependency, governance integration, or application control-plane tool.

**Plane boundary:** See the canonical pattern in the Gateway repo (`SHADCN_MCP_PLANE_BOUNDARY_V1.md` in `docs-governance/canonical/` there). This file is the **workspace-local** pointer and install recipe for `ai-os-voice-interface`.

## Why not the remote shadcn.io MCP URL?

Cursor’s SSE transport often gets **405** from `https://www.shadcn.io/api/mcp`. The stdio server below reads **merged JSON on disk** and avoids that path.

## Source layout (reference repo)

Typical Gateway monorepo paths (adjust if you mirror elsewhere):

| Piece | Path |
|--------|------|
| MCP server (stdio) | `scripts/shadcn-io-catalog-mcp.ts` |
| Catalog data (primary) | `registry-yaml/shadcn-io-catalog/merged_catalog.v1.json` |
| Fallback index | `registry-yaml/shadcn-io-catalog/component_index.v1.json` |
| Copy for dev UI (optional) | `client/public/shadcn-io/merged_catalog.v1.json` |
| Cursor MCP example | `.cursor/mcp.example.json` → `mcpServers.shadcn-io` |
| Merge helper | `scripts/ensure-cursor-shadcn-io-mcp.sh` |
| In-repo docs | `registry-yaml/shadcn-io-catalog/README.md` |

Example origin you cited: `/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai/scripts/shadcn-io-catalog-mcp.ts`.

## Vendoring into this repo

1. Copy `scripts/shadcn-io-catalog-mcp.ts` and the catalog directory (at least `merged_catalog.v1.json`, and `component_index.v1.json` if the server expects it).
2. Align paths inside the script if your layout differs.
3. Merge **[`.cursor/mcp.example.json`](../.cursor/mcp.example.json)** into your user or workspace **[`.cursor/mcp.json`](https://docs.cursor.com/context/mcp)** (Cursor merges workspace + user config).

## Cursor entry pattern

Workspace root should be the MCP `cwd` (default when omitted):

```json
"shadcn-io": {
  "command": "npx",
  "args": ["tsx", "scripts/shadcn-io-catalog-mcp.ts"]
}
```

Requires **dev**: `tsx` (this project already lists `tsx` in `devDependencies`).

## What the MCP exposes

- **Server name:** `shadcn-io-catalog`
- **Tools:**
  - `shadcn_io_about` — spec version, source, disclaimer, entry count
  - `shadcn_io_list` — optional `category`: `ai` | `button` | `hooks` | `text` | `blocks`
  - `shadcn_io_search` — substring search
  - `shadcn_io_get` — one entry by id (e.g. `ai:panel`)

## Agent / skill workflow

Use **[`.cursor/skills/shadcn-io-catalog/SKILL.md`](../.cursor/skills/shadcn-io-catalog/SKILL.md)** in Cursor: prefer this stdio MCP for discovery; do not rely on the remote shadcn.io MCP URL from the agent.

## Related (Gateway repo)

- `registry-yaml/shadcn-io-catalog/README.md` — file roles, npm scripts, Cursor notes
- `docs-governance/artifacts/SHADCN_IO_COMMUNITY_MIRROR_V1.md` — governance mirror notes
- `npm` scripts such as `shadcn-io:generate`, `shadcn-io:health`, `shadcn-io:refresh`, `cursor:mcp:shadcn-io` (see that README)

This app’s UI may still use hand-rolled or Shadcn-inspired components (e.g. `VoicePttButton`); the MCP only helps **choose and document** patterns at design time.
