/**
 * Workspace connection gate — browser-local until auth/MCP health is wired.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type WorkspaceState =
  | 'unknown'
  | 'not_configured'
  | 'connecting'
  | 'connected'
  | 'error';

/** Session-time overrides for disclosure (not persisted). Persistence stays in localStorage / env. */
export type WorkspaceSessionHints = {
  /** True while Connect CTA is in flight (before load completes). */
  isConnecting?: boolean;
  /** When wired: last MCP gate or health check failed (adapter / control plane). */
  lastGateError?: boolean;
};

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
 * Derive gate state for shell disclosure and onboarding vs hub routing.
 * For static payload materialization (e.g. `loadGovernancePayload`), call with no hints.
 * Pass `isConnecting` during Connect; pass `lastGateError` when a future health/ping step fails.
 */
export function resolveWorkspaceState(hints?: WorkspaceSessionHints): WorkspaceState {
  if (hints?.isConnecting) return 'connecting';
  if (hints?.lastGateError) return 'error';
  const url = getWorkspaceMcpUrl();
  if (!url) return 'not_configured';
  if (readWorkspaceUserConnected()) return 'connected';
  return 'unknown';
}

export function shouldShowWorkspaceHub(ws: WorkspaceState): boolean {
  return ws === 'connected';
}
