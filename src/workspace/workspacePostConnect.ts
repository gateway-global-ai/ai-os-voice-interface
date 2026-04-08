/**
 * After the user clicks "Connect Workspace", resume the surface they were trying to open,
 * or land on a default governed read-plane action (calendar list).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CanvasView } from '../shellCanvas/canvasTypes';

const RESUMABLE_HUBS: readonly CanvasView[] = [
  'workspace_calendar_hub',
  'workspace_mail_hub',
  'workspace_drive_hub',
  'workspace_contacts_hub',
  'workspace_search_hub',
];

export type WorkspacePostConnectParams = {
  mailMessageId?: string;
};

/**
 * @param requestedView — `lastLoadRef.view` from the navigation that materialized as onboarding (gate not satisfied).
 * @param params — optional `mailMessageId` when resuming mail hub.
 */
export function workspaceViewAfterConnect(
  requestedView: CanvasView | undefined,
  params?: WorkspacePostConnectParams
): { view: CanvasView; params?: WorkspacePostConnectParams } {
  if (requestedView && RESUMABLE_HUBS.includes(requestedView)) {
    return { view: requestedView, params };
  }
  /** Generic `workspace_hub` / menu entry: first governed read-plane value (calendar list). */
  return { view: 'workspace_calendar_hub' };
}
