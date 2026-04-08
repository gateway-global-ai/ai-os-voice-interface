/**
 * Best-effort **resolved workspace intent id** for shell disclosure / policy (AIOS-SPEC-009).
 * Aligns with routing envelopes in `loadWorkspacePayload` (interface layer).
 *
 * **Gap:** `workspace.mail.thread.summarize` is not represented in payload alone — it is driven from
 * mail UI actions; until that intent is surfaced here, {@link resolvedIntentRequiresLocalModel} stays
 * false for mail-read surfaces. Future: lift active intent from summarize flow or add `routingIntent` on payload.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { WorkspaceCanvasState } from './canvasTypes';
import type { WorkspaceViewPayload } from './loadWorkspacePayload';

/**
 * Returns the primary Phase-1 workspace intent id for the current canvas + payload, or `null`.
 */
export function deriveWorkspaceIntentForDisclosure(
  canvas: WorkspaceCanvasState,
  payload: WorkspaceViewPayload | null,
): string | null {
  if (!canvas || !payload) return null;
  if (payload.view !== canvas.view) return null;

  switch (payload.view) {
    case 'workspace_hub':
    case 'workspace_onboarding':
      return null;
    case 'workspace_calendar_hub':
      return 'workspace.calendar.list';
    case 'workspace_mail_hub': {
      const read = payload.mailRead;
      if (read && read.loadState === 'ok') return 'workspace.mail.read';
      return 'workspace.mail.search';
    }
    case 'workspace_drive_hub':
      return 'workspace.drive.list';
    case 'workspace_contacts_hub':
      return 'workspace.contacts.list';
    case 'workspace_search_hub':
      return 'workspace.web.search';
    default:
      return null;
  }
}
