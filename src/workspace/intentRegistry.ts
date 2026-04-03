/**
 * Phase 1 — read plane only (AIOS-SPEC-007 §12). Extend later phases in separate commits.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export const PHASE_1_WORKSPACE_INTENTS = [
  'workspace.hub',
  'workspace.calendar.list',
  'workspace.calendar.get',
  'workspace.mail.search',
  'workspace.mail.read',
  'workspace.drive.search',
  'workspace.drive.read',
  'workspace.docs.read',
  'workspace.docs.export',
  'workspace.contacts.search',
  'workspace.tasks.list',
  'workspace.tasks.get',
] as const;

export type Phase1WorkspaceIntent = (typeof PHASE_1_WORKSPACE_INTENTS)[number];

export function isPhase1WorkspaceIntent(s: string): s is Phase1WorkspaceIntent {
  return (PHASE_1_WORKSPACE_INTENTS as readonly string[]).includes(s);
}
