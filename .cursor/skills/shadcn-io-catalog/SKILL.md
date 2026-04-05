---
name: shadcn-io-catalog
description: Use the local stdio shadcn-io catalog MCP (merged JSON on disk) for UI component discovery in Cursor. Use when choosing Shadcn/shadcn.io patterns, blocks, or AI UI primitives—or when the user mentions shadcn MCP, catalog, or remote 405 errors.
---

# shadcn-io catalog MCP (Cursor)

**Repo status:** documented, not vendored — when the Gateway script and catalog are copied here and MCP is enabled, treat as **fully vendored** and update this line in the skill + [docs/shadcn-io-catalog-mcp.md](../../../docs/shadcn-io-catalog-mcp.md).

## When to use

- Picking or documenting Shadcn / shadcn.io–style components for this codebase.
- User mentions **shadcn MCP**, **catalog**, or **405** from the remote shadcn.io MCP.

## Rules

1. **Prefer the local stdio MCP** `shadcn-io-catalog` (tools `shadcn_io_about`, `shadcn_io_list`, `shadcn_io_search`, `shadcn_io_get`) after it is enabled in `.cursor/mcp.json`.
2. **Do not** depend on `https://www.shadcn.io/api/mcp` from the agent; it is unreliable with Cursor’s transport.
3. **Runtime boundary:** This MCP is **design-time only**. The voice app does not call it at runtime. It is **not** authoritative for runtime, governance integration, or the Workspace / application control plane — only for Cursor-side component discovery.

## Setup in this workspace

1. Vendor `scripts/shadcn-io-catalog-mcp.ts` and `registry-yaml/shadcn-io-catalog/*.json` from the Gateway repo (see **[docs/shadcn-io-catalog-mcp.md](../../../docs/shadcn-io-catalog-mcp.md)**).
2. Merge **[`.cursor/mcp.example.json`](../../mcp.example.json)** into Cursor **MCP** settings so `shadcn-io` appears.
3. Discovery flow: `shadcn_io_about` → `shadcn_io_search` or `shadcn_io_list` → `shadcn_io_get` for the chosen id.

## If the server is not installed

Say clearly that the MCP is not vendored yet and point to `docs/shadcn-io-catalog-mcp.md`; implement UI from existing project patterns or minimal local components until the catalog is available.
