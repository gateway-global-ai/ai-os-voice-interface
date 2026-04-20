/**
 * Human-readable shell disclosure labels (primary users — no transport jargon).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CanvasView } from '../shellCanvas/canvasTypes';
import type { WorkspaceState } from './workspaceState';

const CANVAS_LABEL: Record<CanvasView, string> = {
  workspace_hub: 'Google Workspace',
  workspace_onboarding: 'Workspace setup',
  workspace_calendar_hub: 'Calendar',
  workspace_mail_hub: 'Mail',
  workspace_drive_hub: 'Drive',
  workspace_contacts_hub: 'Contacts',
  workspace_search_hub: 'Search',
};

/** Short title for the active canvas, for the top bar (primary lane). */
export function canvasSurfaceLabelForShell(view: CanvasView | null | undefined): string | null {
  if (!view) return null;
  return CANVAS_LABEL[view] ?? null;
}

/** One line: Google Workspace connection readiness (plain language). */
export function workspacePrimaryLine(ws: WorkspaceState): string {
  switch (ws) {
    case 'connected':
      return 'Google Workspace connected';
    case 'auth_required':
      return '';
    case 'not_configured':
      return 'Google Workspace not set up in this app';
    case 'connecting':
      return 'Connecting to Google Workspace…';
    case 'error':
      return 'Google Workspace connection issue';
    case 'unknown':
      return '';
    default:
      return '';
  }
}

/** Optional second line for the voice idle panel — what to do next. */
export function workspaceNextStepHint(ws: WorkspaceState): string | null {
  switch (ws) {
    case 'not_configured':
      return 'To use Google Workspace here, your administrator needs to configure the integration.';
    case 'unknown':
      return 'To connect Google Workspace, open Menu and sign in when you are ready.';
    case 'auth_required':
      return 'Open Google Workspace from Menu and use Sign in with Google at the top of the panel.';
    case 'error':
      return 'Retry Workspace from Menu after checking your network or sign-in.';
    case 'connecting':
      return null;
    case 'connected':
      return null;
    default:
      return null;
  }
}
