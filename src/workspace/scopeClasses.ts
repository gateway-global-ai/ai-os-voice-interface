/**
 * Layer 1 scope classes + mandatory one-to-one mapping from Layer 2 intents.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { WorkspaceScopeClass } from './types';
import { PHASE_1_WORKSPACE_INTENTS, type Phase1WorkspaceIntent } from './intentRegistry';

/** Canonical Layer 1 values (for policy and UI). */
export const WORKSPACE_SCOPE_CLASSES: readonly WorkspaceScopeClass[] = [
  'workspace.google.read',
  'workspace.google.write',
  'workspace.google.send',
  'workspace.google.share',
  'workspace.google.automation',
  'workspace.google.identity',
  'workspace.google.search',
] as const;

/**
 * Single source of truth: each Phase 1 intent maps to exactly one scope class.
 * SPEC-007: one intent → one scope class — no multi-label intents.
 */
export const INTENT_TO_SCOPE_CLASS: Record<Phase1WorkspaceIntent, WorkspaceScopeClass> = {
  'workspace.hub': 'workspace.google.read',
  'workspace.calendar.list': 'workspace.google.read',
  'workspace.calendar.get': 'workspace.google.read',
  'workspace.mail.search': 'workspace.google.read',
  'workspace.mail.read': 'workspace.google.read',
  'workspace.drive.search': 'workspace.google.read',
  'workspace.drive.read': 'workspace.google.read',
  'workspace.docs.read': 'workspace.google.read',
  'workspace.docs.export': 'workspace.google.read',
  'workspace.contacts.search': 'workspace.google.identity',
  'workspace.tasks.list': 'workspace.google.read',
  'workspace.tasks.get': 'workspace.google.read',
};

function assertOneToOneMapping(): void {
  const seen = new Set<string>();
  for (const k of PHASE_1_WORKSPACE_INTENTS) {
    if (seen.has(k)) throw new Error(`Duplicate intent in registry: ${k}`);
    seen.add(k);
  }
  for (const intent of PHASE_1_WORKSPACE_INTENTS) {
    if (!INTENT_TO_SCOPE_CLASS[intent]) {
      throw new Error(`Missing scope class for intent: ${intent}`);
    }
  }
}

assertOneToOneMapping();

export function resolveScopeClass(intent: string): WorkspaceScopeClass | null {
  if (intent in INTENT_TO_SCOPE_CLASS) {
    return INTENT_TO_SCOPE_CLASS[intent as Phase1WorkspaceIntent];
  }
  return null;
}
