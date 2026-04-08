/**
 * Workspace connection gate — browser-local until auth/MCP health is wired.
 *
 * **#14:** `connected` requires an **execution-time** MCP bearer (GIS session or env token), not
 * only the “Connect Workspace” preference. `auth_required` = user opted in + MCP URL set, but no token.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { getWorkspaceMcpBearerTokenFromEnv } from '../workspace/mcpAdapter';
import { getSessionGoogleAccessToken } from '../workspace/workspaceSessionAuth';
import type { WorkspaceState } from '../core/types/workspaceState';

export type { WorkspaceState };

/** Session-time overrides for disclosure (not persisted). Persistence stays in localStorage / env. */
export type WorkspaceSessionHints = {
  /** True while Connect CTA is in flight (before load completes). */
  isConnecting?: boolean;
  /** When wired: last MCP gate or health check failed (adapter / control plane). */
  lastGateError?: boolean;
};

/** Local “Connect Workspace” flag — **not** Google OAuth. MCP auth uses Bearer token (GIS sign-in or env). */
const LS_CONNECTED = 'aios.workspace.connected';

export function getWorkspaceMcpUrl(): string | undefined {
  const u = import.meta.env.VITE_WORKSPACE_MCP_URL;
  return typeof u === 'string' && u.trim() ? u.trim() : undefined;
}

export function readWorkspaceUserConnected(): boolean {
  try {
    return localStorage.getItem(LS_CONNECTED) === '1';
  } catch {
    return false;
  }
}

export function setWorkspaceUserConnected(connected: boolean): void {
  try {
    if (connected) localStorage.setItem(LS_CONNECTED, '1');
    else localStorage.removeItem(LS_CONNECTED);
  } catch {
    /* ignore */
  }
}

/**
 * Same bearer sources as `integrationControlPlane` / MCP `tools/call` (GIS first, then env).
 * Single source of truth for whether Workspace MCP execution can authenticate.
 */
export function hasWorkspaceMcpExecutionToken(): boolean {
  if (getSessionGoogleAccessToken()?.trim()) return true;
  if (getWorkspaceMcpBearerTokenFromEnv()?.trim()) return true;
  return false;
}

/**
 * Derive gate state for shell disclosure and onboarding vs hub routing.
 * For static payload materialization (e.g. `loadWorkspacePayload`), call with no hints.
 * Pass `isConnecting` during Connect; pass `lastGateError` when a future health/ping step fails.
 */
export function resolveWorkspaceState(hints?: WorkspaceSessionHints): WorkspaceState {
  if (hints?.isConnecting) return 'connecting';
  if (hints?.lastGateError) return 'error';
  const url = getWorkspaceMcpUrl();
  if (!url) return 'not_configured';
  if (!readWorkspaceUserConnected()) return 'unknown';
  if (!hasWorkspaceMcpExecutionToken()) return 'auth_required';
  return 'connected';
}

/** User may open governed Workspace hub UIs (MCP URL + preference). May still need GIS sign-in (`auth_required`). */
export function shouldShowWorkspaceHub(ws: WorkspaceState): boolean {
  return ws === 'connected' || ws === 'auth_required';
}
