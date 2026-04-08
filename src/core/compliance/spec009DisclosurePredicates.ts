/**
 * SPEC-009 §12.2 primary disclosure **predicates** (execution readiness threshold).
 * **Core** — no React, no user-facing copy (AIOS-ADR-001).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { LocalModelReadiness } from '../../local-llm/types';
import type { WorkspaceState } from '../types/workspaceState';

export type PrimaryDisclosureInput = {
  workspaceState: WorkspaceState;
  voiceInputAvailable: boolean;
  shellInteractionMode: 'voice' | 'chat';
  localModelReadiness?: LocalModelReadiness | null;
  /**
   * When true, the resolved intent requires local interpretation (policy / POL-MODEL-*).
   * If omitted, capability blocking is not evaluated (no local line).
   */
  resolvedIntentRequiresLocalModel?: boolean;
};

/** Machine-oriented capability line for policy / secondary strip (not primary marketing copy). */
export function localCapabilityBlockingLine(readiness: LocalModelReadiness): string | null {
  if (readiness.status === 'running_ready' && readiness.localLlmEnabled) return null;
  switch (readiness.status) {
    case 'running_ready':
      return 'Local model: disabled by policy';
    case 'degraded':
      return 'Local model: degraded';
    case 'running_no_models':
      return 'Local model: no models';
    case 'installed_not_running':
      return 'Local model: runtime not running';
    case 'not_installed':
      return 'Local model: not installed';
    default:
      return 'Local model: unavailable';
  }
}

/**
 * Whether §12.2-style primary disclosure should surface (execution readiness below policy minimum
 * for this context). Used for tests and chrome minimization rules.
 */
export function primarySurfaceSystemStateDisclosureNeeded(i: PrimaryDisclosureInput): boolean {
  if (i.shellInteractionMode === 'voice' && !i.voiceInputAvailable) return true;
  if (i.workspaceState === 'error' || i.workspaceState === 'connecting') return true;
  if (i.workspaceState === 'unknown' || i.workspaceState === 'not_configured') return true;
  if (i.workspaceState === 'auth_required') return true;
  if (i.resolvedIntentRequiresLocalModel && i.localModelReadiness) {
    const line = localCapabilityBlockingLine(i.localModelReadiness);
    if (line) return true;
  }
  return false;
}
