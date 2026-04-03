/**
 * Workspace Intent Router — validates Layer 2 shape and maps to canvas / scope class.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { GovernanceCanvasState } from '../governance/canvasTypes';
import { isPhase1WorkspaceIntent } from './intentRegistry';
import { resolveScopeClass } from './scopeClasses';

export type ParsedWorkspaceIntent = {
  intent: string;
  /** Optional hints for future MCP mapping */
  query?: string;
  resource_id?: string;
};

const WORKSPACE_INTENT_RE = /^workspace\.[a-z]+\.[a-z0-9_]+$/;

export function isValidWorkspaceIntentShape(intent: string): boolean {
  if (intent === 'workspace.hub') return true;
  return WORKSPACE_INTENT_RE.test(intent);
}

/**
 * Map intent → governed canvas surface (Phase 1).
 * Calendar / mail read-plane intents get dedicated hubs; others open the main workspace hub.
 */
export function workspaceIntentToCanvasView(parsed: ParsedWorkspaceIntent): GovernanceCanvasState {
  const { intent } = parsed;
  if (!isPhase1WorkspaceIntent(intent)) {
    return { view: 'workspace_hub' };
  }
  if (intent === 'workspace.calendar.list' || intent === 'workspace.calendar.get') {
    return { view: 'workspace_calendar_hub' };
  }
  if (intent === 'workspace.mail.search' || intent === 'workspace.mail.read') {
    return { view: 'workspace_mail_hub' };
  }
  return { view: 'workspace_hub' };
}

export function routeWorkspaceIntent(parsed: ParsedWorkspaceIntent): {
  canvas: GovernanceCanvasState;
  scopeClass: ReturnType<typeof resolveScopeClass>;
} {
  const scopeClass = resolveScopeClass(parsed.intent);
  return {
    canvas: workspaceIntentToCanvasView(parsed),
    scopeClass,
  };
}
