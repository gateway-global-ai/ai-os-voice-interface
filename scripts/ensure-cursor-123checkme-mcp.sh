#!/usr/bin/env bash
# Merge 123CheckMe remote MCP into .cursor/mcp.json (preserves other servers).
# Requires jq. Does not read or print tokens. Reload Cursor after running.
#
# Usage:
#   CHECKME_MCP_URL='https://your-mcp-host.example/mcp' ./scripts/ensure-cursor-123checkme-mcp.sh
#
# Optional:
#   CHECKME_MCP_AUTH=oauth   — only "url" is written (use Cursor Settings → MCP → Connect for OAuth)
#   default CHECKME_MCP_AUTH=bearer — adds Authorization: Bearer ${env:CHECKME_MCP_TOKEN}
#
# Primary docs: https://cursor.com/docs/context/mcp
# MCP servers: https://modelcontextprotocol.io/docs/develop/build-server
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/.cursor/mcp.json"
mkdir -p "$ROOT/.cursor"
if ! command -v jq &>/dev/null; then
  echo "jq is required (apt install jq / brew install jq)."
  exit 1
fi
URL="${CHECKME_MCP_URL:-}"
if [ -z "$URL" ]; then
  echo "Set CHECKME_MCP_URL to the Streamable HTTP / JSON-RPC MCP endpoint from your 123CheckMe SaaS operator dashboard."
  echo "Example shape: https://<host>/mcp — must accept POST initialize (see https://modelcontextprotocol.io/docs/develop/build-server)."
  exit 1
fi
AUTH="${CHECKME_MCP_AUTH:-bearer}"
if [ ! -f "$OUT" ]; then
  echo '{"mcpServers":{}}' >"$OUT"
fi
tmp="$(mktemp)"
if [ "$AUTH" = "oauth" ]; then
  jq --arg url "$URL" '.mcpServers["123checkme"] = {url: $url}' "$OUT" >"$tmp"
else
  jq --arg url "$URL" \
    '.mcpServers["123checkme"] = {
      url: $url,
      headers: { Authorization: "Bearer ${env:CHECKME_MCP_TOKEN}" }
    }' "$OUT" >"$tmp"
fi
mv "$tmp" "$OUT"
echo "Updated $OUT — server name \"123checkme\". Set CHECKME_MCP_TOKEN in your environment (bearer mode) or use OAuth in Cursor. Reload Window."
