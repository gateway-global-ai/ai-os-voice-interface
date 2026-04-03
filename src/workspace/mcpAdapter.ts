/**
 * External MCP adapter boundary — Google Workspace MCP runs out-of-process (AIOS-SPEC-007).
 * Phase 1: no default URL; returns not_configured until env is set.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type McpAdapterCallResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: 'not_configured' | 'timeout' | 'http_error' | 'auth_error'; message: string };

function getWorkspaceMcpBaseUrl(): string | null {
  const url =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WORKSPACE_MCP_URL ??
    (typeof process !== 'undefined' ? process.env?.VITE_WORKSPACE_MCP_URL : undefined);
  if (url && url.trim()) return url.trim().replace(/\/$/, '');
  return null;
}

/**
 * Placeholder for streamable HTTP / JSON-RPC to Workspace MCP. Wire when server URL is deployed.
 */
export async function callWorkspaceMcpAdapter(_params: {
  tool: string;
  args: Record<string, unknown>;
  bearerToken?: string;
  signal?: AbortSignal;
}): Promise<McpAdapterCallResult> {
  const base = getWorkspaceMcpBaseUrl();
  if (!base) {
    return {
      ok: false,
      code: 'not_configured',
      message:
        'Workspace MCP URL not configured (set VITE_WORKSPACE_MCP_URL). Control plane blocks raw execution.',
    };
  }
  // Future: POST to streamable-http endpoint with policy-sanitized args + timeout.
  return {
    ok: false,
    code: 'not_configured',
    message: `Workspace MCP base ${base} — adapter dispatch not yet implemented in Phase 1 UI shell.`,
  };
}
