/**
 * Policy gate for Workspace canvas surfaces and control plane (POL-WORKSPACE-*).
 * Phase 1: founder / dev allow read-plane; extend with real identity later.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CanvasView } from '../governance/canvasTypes';
import type { WorkspaceScopeClass } from './types';

export type WorkspaceSurfaceMode = 'public' | 'founder' | 'operator' | 'customer';

/** Dev default: allow read-plane surfaces only. */
const ALLOWED_PHASE1_VIEWS: ReadonlySet<CanvasView> = new Set(['workspace_hub', 'workspace_calendar_hub']);

export function evaluateWorkspaceCanvasPolicy(view: CanvasView): { allowed: boolean; reason?: string } {
  if (!ALLOWED_PHASE1_VIEWS.has(view)) {
    return { allowed: false, reason: 'Workspace surface not enabled for this actor (Phase 1).' };
  }
  return { allowed: true };
}

export function canExecuteScopeClass(
  scope: WorkspaceScopeClass,
  _mode: WorkspaceSurfaceMode
): { allowed: boolean; reason?: string } {
  const readPlane: WorkspaceScopeClass[] = [
    'workspace.google.read',
    'workspace.google.identity',
    'workspace.google.search',
  ];
  if (readPlane.includes(scope)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Scope ${scope} is not in Phase 1 read plane — execution blocked.`,
  };
}
