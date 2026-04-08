/**
 * Workspace canvas views only — Google Workspace read plane (AIOS-SPEC-007).
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type CanvasView =
  | 'workspace_hub'
  | 'workspace_onboarding'
  | 'workspace_calendar_hub'
  | 'workspace_mail_hub'
  | 'workspace_drive_hub'
  | 'workspace_contacts_hub'
  | 'workspace_search_hub';

export type WorkspaceCanvasState = {
  view: CanvasView;
  /** Gmail message id for mail read hub. */
  mailMessageId?: string;
} | null;

export const ALL_CANVAS_VIEWS: CanvasView[] = [
  'workspace_hub',
  'workspace_onboarding',
  'workspace_calendar_hub',
  'workspace_mail_hub',
  'workspace_drive_hub',
  'workspace_contacts_hub',
  'workspace_search_hub',
];
