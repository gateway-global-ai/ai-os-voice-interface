/**
 * Defaults for Tier B MCP-UI (sandbox on separate origin, pilot MCP proxied under Vite).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export function mcpStreamableHttpUrl(): string {
  const v = import.meta.env.VITE_MCP_SHELL_STREAMABLE_URL as string | undefined;
  if (v && v.length > 0) return v;
  return `${window.location.origin}/mcp/core`;
}

export function mcpSandboxFrameUrl(): URL {
  const base = (import.meta.env.VITE_MCP_SANDBOX_URL as string | undefined) || 'http://127.0.0.1:8766';
  const u = new URL(`${base.replace(/\/$/, '')}/sandbox.html`);
  u.searchParams.set('parentOrigin', window.location.origin);
  return u;
}
