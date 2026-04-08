/**
 * Workspace Intent Router — validates Layer 2 shape and maps to canvas / scope class.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { WorkspaceCanvasState } from '../shellCanvas/canvasTypes';
import { isPhase1WorkspaceIntent } from './intentRegistry';
import { resolveScopeClass } from './scopeClasses';

export type ParsedWorkspaceIntent = {
  intent: string;
  /** Optional hints for future MCP mapping */
  query?: string;
  resource_id?: string;
};

/**
 * Gmail **message** id for `loadWorkspacePayload` / `workspace.mail.read` only.
 * Do not use for `workspace.mail.thread.read` (thread id) or `workspace.mail.search` (uses `query`).
 */
export function workspaceMailReadMessageIdFromIntent(parsed: ParsedWorkspaceIntent): string | undefined {
  if (parsed.intent !== 'workspace.mail.read') return undefined;
  const t = parsed.resource_id?.trim();
  return t || undefined;
}

const WORKSPACE_INTENT_RE = /^workspace\.[a-z]+\.[a-z0-9_]+$/;

export function isValidWorkspaceIntentShape(intent: string): boolean {
  if (intent === 'workspace.hub') return true;
  return WORKSPACE_INTENT_RE.test(intent);
}

/**
 * Map intent → governed canvas surface (Phase 1).
 * Calendar / mail read-plane intents get dedicated hubs; others open the main workspace hub.
 */
export function workspaceIntentToCanvasView(parsed: ParsedWorkspaceIntent): WorkspaceCanvasState {
  const { intent } = parsed;
  if (!isPhase1WorkspaceIntent(intent)) {
    return { view: 'workspace_hub' };
  }
  if (intent === 'workspace.calendar.list' || intent === 'workspace.calendar.get') {
    return { view: 'workspace_calendar_hub' };
  }
  if (
    intent === 'workspace.mail.search' ||
    intent === 'workspace.mail.read' ||
    intent === 'workspace.mail.thread.read' ||
    intent === 'workspace.mail.thread.summarize' ||
    intent === 'workspace.mail.draft_reply'
  ) {
    return { view: 'workspace_mail_hub' };
  }
  if (
    intent === 'workspace.drive.list' ||
    intent === 'workspace.drive.search' ||
    intent === 'workspace.drive.read'
  ) {
    return { view: 'workspace_drive_hub' };
  }
  if (intent === 'workspace.contacts.list' || intent === 'workspace.contacts.search') {
    return { view: 'workspace_contacts_hub' };
  }
  if (intent === 'workspace.web.search') {
    return { view: 'workspace_search_hub' };
  }
  return { view: 'workspace_hub' };
}

export function routeWorkspaceIntent(parsed: ParsedWorkspaceIntent): {
  canvas: WorkspaceCanvasState;
  scopeClass: ReturnType<typeof resolveScopeClass>;
} {
  const scopeClass = resolveScopeClass(parsed.intent);
  return {
    canvas: workspaceIntentToCanvasView(parsed),
    scopeClass,
  };
}
