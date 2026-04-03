/**
 * Sole authority for shell-level navigation from agent output (INTENT_JSON app.*).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { extractIntentJsonObject } from '../governance/intentParse';
import { logGovernanceAudit } from '../governance/governanceAudit';

export type ShellNavigationAction =
  | { type: 'none' }
  | { type: 'set_mode'; mode: ShellTargetMode }
  | { type: 'open_workspace' };

/** Subset of App shell modes addressable by app.* intents */
export type ShellTargetMode = 'voice_settings' | 'disc_settings' | 'intent_settings';

export type ShellRouteResult = {
  action: ShellNavigationAction;
  /** When false, caller should run governance/workspace canvas routing (`applyAgentIntent`). */
  delegateGovernance: boolean;
};

function mapAppIntent(raw: Record<string, unknown>): ShellNavigationAction {
  const intent = typeof raw.intent === 'string' ? raw.intent : '';
  switch (intent) {
    case 'app.open.voice_settings':
      return { type: 'set_mode', mode: 'voice_settings' };
    case 'app.open.disc_settings':
      return { type: 'set_mode', mode: 'disc_settings' };
    case 'app.open.intent_settings':
      return { type: 'set_mode', mode: 'intent_settings' };
    case 'app.open.workspace': {
      const target = typeof raw.target === 'string' ? raw.target : '';
      if (target === 'workspace.hub' || target === '') {
        return { type: 'open_workspace' };
      }
      return { type: 'none' };
    }
    default:
      return { type: 'none' };
  }
}

/**
 * If INTENT_JSON contains `app.*`, returns shell action and does NOT delegate to governance.
 * Otherwise delegates governance parsing to the caller.
 */
export function routeShellAgentText(agentText: string): ShellRouteResult {
  const raw = extractIntentJsonObject(agentText);
  if (!raw) {
    logGovernanceAudit('intent_fallback_used', {
      subsystem: 'shell',
      reason: 'no_intent_json_line',
      textLength: agentText.length,
      textPreview: agentText.slice(0, 280),
    });
    return { action: { type: 'none' }, delegateGovernance: true };
  }
  if (raw && typeof raw.intent === 'string' && raw.intent.startsWith('app.')) {
    const action = mapAppIntent(raw);
    if (action.type !== 'none') {
      logGovernanceAudit('intent_parsed', {
        source: 'json',
        intent: raw.intent,
        subsystem: 'shell',
      });
      return { action, delegateGovernance: false };
    }
    return { action: { type: 'none' }, delegateGovernance: true };
  }
  return { action: { type: 'none' }, delegateGovernance: true };
}
