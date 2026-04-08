/**
 * Workspace canvas transitions (UI graph).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CanvasView, WorkspaceCanvasState } from './canvasTypes';

/** Default “home” when backing out of Workspace onboarding. */
export const WORKSPACE_HOME_VIEW: CanvasView = 'workspace_hub';

export function isWorkspaceHubView(view: CanvasView): boolean {
  return view === WORKSPACE_HOME_VIEW;
}

export function isWorkspaceSubSurface(view: CanvasView): boolean {
  return view !== WORKSPACE_HOME_VIEW;
}

export const UI_ALLOWED_TRANSITIONS: Record<CanvasView, readonly CanvasView[]> = {
  workspace_hub: [
    'workspace_hub',
    'workspace_calendar_hub',
    'workspace_mail_hub',
    'workspace_drive_hub',
    'workspace_contacts_hub',
    'workspace_search_hub',
    'workspace_onboarding',
  ],
  workspace_onboarding: [
    'workspace_hub',
    'workspace_calendar_hub',
    'workspace_mail_hub',
    'workspace_drive_hub',
    'workspace_contacts_hub',
    'workspace_search_hub',
  ],
  workspace_calendar_hub: ['workspace_hub', 'workspace_onboarding'],
  workspace_mail_hub: ['workspace_hub', 'workspace_onboarding'],
  workspace_drive_hub: ['workspace_hub', 'workspace_onboarding'],
  workspace_contacts_hub: ['workspace_hub', 'workspace_onboarding'],
  workspace_search_hub: ['workspace_hub', 'workspace_onboarding'],
} as const satisfies Record<CanvasView, readonly CanvasView[]>;

export type CanvasTransitionMode = 'ui' | 'intent';

export function validateWorkspaceTransition(
  from: CanvasView | null,
  to: CanvasView,
  mode: CanvasTransitionMode
): boolean {
  if (mode === 'intent') return true;
  if (from === null) return true;
  if (from === to) return true;
  const allowed = UI_ALLOWED_TRANSITIONS[from];
  return (allowed as readonly CanvasView[]).includes(to);
}

export function transitionBackdropDismiss(current: NonNullable<WorkspaceCanvasState>): WorkspaceCanvasState {
  if (isWorkspaceHubView(current.view)) return null;
  return { view: WORKSPACE_HOME_VIEW };
}

export function transitionSubSurfaceBackToHub(): NonNullable<WorkspaceCanvasState> {
  return { view: WORKSPACE_HOME_VIEW };
}

export function buildWorkspaceCanvasState(
  view: CanvasView,
  params?: {
    documentId?: string;
    workflowRunId?: string;
    actionPlanSource?: string;
    amendmentWorkflowMode?: 'edit' | 'review';
    mailMessageId?: string;
  }
): NonNullable<WorkspaceCanvasState> {
  if (view === 'workspace_mail_hub') {
    const mid = params?.mailMessageId?.trim();
    return mid ? { view, mailMessageId: mid } : { view };
  }
  return { view };
}
