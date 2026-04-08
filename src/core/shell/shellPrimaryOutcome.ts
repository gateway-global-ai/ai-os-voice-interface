/**
 * Shell-owned primary outcomes — **AMD-2026-012 §7** (finite family).
 * **Core** module — no React (AIOS-ADR-001).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CanvasView } from '../../shellCanvas/canvasTypes';

/** Semantic equivalents required by AMD-2026-012 §7 table. */
export type ShellPrimaryOutcome =
  | 'ready_for_intent'
  | 'needs_clarification'
  | 'needs_auth'
  | 'needs_permission'
  | 'discovery_mode'
  | 'ready_to_execute'
  | 'executed_with_result'
  | 'execution_failed';

export type ShellOutcomeAgentPhase = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export type DeriveShellPrimaryOutcomeInput = {
  canvasView: CanvasView | null | undefined;
  agentPhase: ShellOutcomeAgentPhase;
  workspaceAuthRequired?: boolean;
};

/**
 * Best-effort derivation for primary UX and conformance tests.
 * Refine as SessionContext / PolicyRecord wiring lands (**AMD-2026-012 §7** normative mapping).
 */
export function deriveShellPrimaryOutcome(i: DeriveShellPrimaryOutcomeInput): ShellPrimaryOutcome {
  if (i.agentPhase === 'error') return 'execution_failed';

  if (i.canvasView === 'workspace_onboarding' || i.workspaceAuthRequired) {
    return 'needs_auth';
  }

  if (!i.canvasView) {
    if (i.agentPhase === 'processing' || i.agentPhase === 'speaking') {
      return 'ready_to_execute';
    }
    return 'ready_for_intent';
  }

  if (i.agentPhase === 'processing' || i.agentPhase === 'speaking') {
    return 'ready_to_execute';
  }

  return 'executed_with_result';
}
