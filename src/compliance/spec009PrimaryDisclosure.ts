/**
 * Primary surface disclosure — **presentation** layer for AIOS-SPEC-009 §12.2.
 * Predicates live in **`src/core/compliance/spec009DisclosurePredicates.ts`** (AIOS-ADR-001).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import {
  localCapabilityBlockingLine,
  primarySurfaceSystemStateDisclosureNeeded,
  type PrimaryDisclosureInput,
} from '../core/compliance/spec009DisclosurePredicates';
import { workspacePrimaryLine } from '../shell/shellSurfaceLabels';

export type { PrimaryDisclosureInput } from '../core/compliance/spec009DisclosurePredicates';
export { primarySurfaceSystemStateDisclosureNeeded } from '../core/compliance/spec009DisclosurePredicates';

/**
 * Secondary line for the primary shell strip: **Auth / adapter / lane-adjacent** copy
 * (Workspace connection) plus voice affordance and optional **capability** (local model)
 * when the resolved intent requires it.
 */
export function buildPrimarySecondaryDisclosureLine(i: PrimaryDisclosureInput): string {
  const parts: string[] = [];
  const wsLine = workspacePrimaryLine(i.workspaceState);
  if (wsLine) parts.push(wsLine);
  if (i.shellInteractionMode === 'voice' && !i.voiceInputAvailable) {
    parts.push('Voice input unavailable — use Chat.');
  }
  if (i.resolvedIntentRequiresLocalModel && i.localModelReadiness) {
    const cap = localCapabilityBlockingLine(i.localModelReadiness);
    if (cap) parts.push(cap);
  }
  return parts.filter(Boolean).join(' — ');
}
