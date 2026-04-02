/**
 * Transition validation (UI graph) vs state materialization (build) — keep them separate.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CanvasView, GovernanceCanvasState } from './canvasTypes';

/** Intent entry: work modes for the current actor — not the document library. */
export const GOVERNANCE_HOME_VIEW: CanvasView = 'governance_hub';

export function isGovernanceHomeView(view: CanvasView): boolean {
  return view === GOVERNANCE_HOME_VIEW;
}

export function isGovernanceSubSurface(view: CanvasView): boolean {
  return view !== GOVERNANCE_HOME_VIEW;
}

/**
 * UI-only allowed edges. Intent-driven opens use `transitionMode: 'intent'` and skip this table.
 */
export const UI_ALLOWED_TRANSITIONS: Record<CanvasView, readonly CanvasView[]> = {
  governance_hub: [
    'governance_hub',
    'review_docs',
    'discuss_documents',
    'planning_assistant',
    'research_assistant',
    'amendment_workflow',
    'action_plan_review',
  ],
  review_docs: [
    'governance_hub',
    'document_list',
    'document_view',
    'conflict_results',
    'compliance_check',
  ],
  discuss_documents: ['governance_hub'],
  planning_assistant: ['governance_hub', 'lifecycle_status', 'document_list', 'document_view'],
  research_assistant: ['governance_hub', 'document_list', 'document_view'],
  amendment_workflow: ['governance_hub', 'action_plan_review'],
  action_plan_review: ['governance_hub', 'amendment_workflow'],
  document_list: [
    'governance_hub',
    'review_docs',
    'document_view',
    'conflict_results',
    'compliance_check',
    'lifecycle_status',
    'document_list',
  ],
  document_view: [
    'governance_hub',
    'review_docs',
    'document_list',
    'planning_assistant',
    'research_assistant',
    'amendment_workflow',
  ],
  conflict_results: ['governance_hub', 'review_docs', 'document_list'],
  compliance_check: ['governance_hub', 'review_docs', 'document_list'],
  lifecycle_status: ['governance_hub', 'planning_assistant', 'document_list'],
} as const satisfies Record<CanvasView, readonly CanvasView[]>;

export type CanvasTransitionMode = 'ui' | 'intent';

export function validateGovernanceTransition(
  from: CanvasView | null,
  to: CanvasView,
  mode: CanvasTransitionMode
): boolean {
  if (mode === 'intent') return true;
  if (from === null) return true;
  /** Same view: reload after API advance, Retry, or refresh — not a navigation edge. */
  if (from === to) return true;
  const allowed = UI_ALLOWED_TRANSITIONS[from];
  return (allowed as readonly CanvasView[]).includes(to);
}

export const CANVAS_TRANSITION_LABELS = {
  hubToWorkMode: 'governance_hub->work_mode',
  workModeToHub: 'work_mode->governance_hub',
  reviewToList: 'review_docs->document_list',
  openCanvas: 'null->view',
} as const;

export function transitionBackdropDismiss(current: NonNullable<GovernanceCanvasState>): GovernanceCanvasState {
  if (isGovernanceHomeView(current.view)) return null;
  return { view: GOVERNANCE_HOME_VIEW };
}

export function transitionSubSurfaceBackToHub(): NonNullable<GovernanceCanvasState> {
  return { view: GOVERNANCE_HOME_VIEW };
}

export function buildGovernanceCanvasState(
  view: CanvasView,
  params?: { documentId?: string; workflowRunId?: string; actionPlanSource?: string }
): NonNullable<GovernanceCanvasState> {
  if (view === 'document_view') {
    const id = params?.documentId?.trim();
    if (!id) return { view: GOVERNANCE_HOME_VIEW };
    return { view: 'document_view', documentId: id };
  }
  const doc = params?.documentId?.trim();
  if (view === 'lifecycle_status' && doc) {
    return { view: 'lifecycle_status', documentId: doc };
  }
  if (view === 'amendment_workflow') {
    const w = params?.workflowRunId?.trim();
    return w ? { view: 'amendment_workflow', workflowRunId: w } : { view: 'amendment_workflow' };
  }
  if (view === 'action_plan_review') {
    const s = params?.actionPlanSource?.trim() || 'AMD-2026-a10b9a';
    return { view: 'action_plan_review', actionPlanSource: s };
  }
  return { view, documentId: undefined };
}
