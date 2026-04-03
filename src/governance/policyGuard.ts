/**
 * Policy gate before rendering governance canvas surfaces.
 * Stub: allow all views locally; replace with PolicyDecision from control plane later.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CanvasView } from './canvasTypes';
import { ALL_CANVAS_VIEWS } from './canvasTypes';
import { evaluateWorkspaceCanvasPolicy } from '../workspace/workspacePolicy';

export type PolicyDecision = {
  allowed: boolean;
  allowedViews: CanvasView[];
  reason?: string;
};

const DEV_ALLOW_ALL: PolicyDecision = {
  allowed: true,
  allowedViews: [...ALL_CANVAS_VIEWS],
};

/**
 * Evaluate whether a canvas view may open. Hook: audit log, role, knowledge certification.
 */
export function evaluateCanvasPolicy(view: CanvasView): PolicyDecision {
  if (view === 'workspace_hub' || view === 'workspace_calendar_hub') {
    const w = evaluateWorkspaceCanvasPolicy(view);
    if (!w.allowed) {
      return { allowed: false, allowedViews: [...ALL_CANVAS_VIEWS], reason: w.reason };
    }
  }
  // TODO: integrate PolicyDecision from DCP / session roles / knowledge gate
  if (!DEV_ALLOW_ALL.allowedViews.includes(view)) {
    return { allowed: false, allowedViews: DEV_ALLOW_ALL.allowedViews, reason: 'View not permitted' };
  }
  return DEV_ALLOW_ALL;
}

export function canOpenCanvas(view: CanvasView): boolean {
  return evaluateCanvasPolicy(view).allowed;
}
