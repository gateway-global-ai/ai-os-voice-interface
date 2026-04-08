/**
 * Sole authority for shell-level navigation from agent output (INTENT_JSON app.*).
 * app.shell.* uses the same shell-state plane as deterministic voice/chat commands.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { extractIntentJsonObject } from '../shellCanvas/intentParse';
import { logShellCanvasAudit } from '../shellCanvas/shellCanvasAudit';
import type { ShellSurfaceMode } from './shellSurfaceMode';

export type ShellNavigationAction =
  | { type: 'none' }
  | { type: 'set_mode'; mode: ShellTargetMode }
  | { type: 'open_workspace' }
  | { type: 'set_surface_mode'; mode: ShellSurfaceMode }
  | { type: 'set_voice_chat_mode'; mode: 'voice' | 'chat' };

/** Subset of App shell modes addressable by app.open.* intents */
export type ShellTargetMode = 'voice_settings' | 'disc_settings' | 'intent_settings';

export type ShellRouteResult = {
  action: ShellNavigationAction;
  /** When true, caller may run `applyAgentIntent` (workspace INTENT_JSON only). */
  delegateWorkspaceCanvas: boolean;
};

function parseSurfaceField(raw: Record<string, unknown>): ShellSurfaceMode | null {
  const s =
    typeof raw.surface === 'string'
      ? raw.surface
      : typeof raw.mode === 'string'
        ? raw.mode
        : '';
  if (s === 'primary' || s === 'developer' || s === 'operator') return s;
  return null;
}

/**
 * Agent-emitted shell-state actions (app.shell.*) — dedicated shell control path.
 */
function mapShellIntent(raw: Record<string, unknown>): ShellNavigationAction {
  const intent = typeof raw.intent === 'string' ? raw.intent : '';
  switch (intent) {
    case 'app.shell.surface_mode': {
      const m = parseSurfaceField(raw);
      return m ? { type: 'set_surface_mode', mode: m } : { type: 'none' };
    }
    case 'app.shell.switch_to_chat':
      return { type: 'set_voice_chat_mode', mode: 'chat' };
    case 'app.shell.switch_to_voice':
      return { type: 'set_voice_chat_mode', mode: 'voice' };
    case 'app.shell.enter_operator':
      return { type: 'set_surface_mode', mode: 'operator' };
    case 'app.shell.exit_operator':
      return { type: 'set_surface_mode', mode: 'primary' };
    case 'app.shell.enter_developer':
      return { type: 'set_surface_mode', mode: 'developer' };
    case 'app.shell.exit_developer':
      return { type: 'set_surface_mode', mode: 'primary' };
    default:
      return { type: 'none' };
  }
}

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
 * If INTENT_JSON contains `app.*`, returns shell action and does not delegate canvas routing.
 * Workspace intents (`workspace.*`, non-`app.*`) may delegate to `applyAgentIntent`.
 */
export function routeShellAgentText(agentText: string): ShellRouteResult {
  const raw = extractIntentJsonObject(agentText);
  if (!raw) {
    logShellCanvasAudit('intent_fallback_used', {
      subsystem: 'shell',
      reason: 'no_intent_json_line',
      textLength: agentText.length,
      textPreview: agentText.slice(0, 280),
    });
    return { action: { type: 'none' }, delegateWorkspaceCanvas: false };
  }
  const intent = typeof raw.intent === 'string' ? raw.intent : '';

  if (intent.startsWith('app.shell.')) {
    const action = mapShellIntent(raw);
    if (action.type !== 'none') {
      logShellCanvasAudit('intent_parsed', {
        source: 'json',
        intent,
        subsystem: 'shell.shell_state',
      });
      return { action, delegateWorkspaceCanvas: false };
    }
    logShellCanvasAudit('shell_intent_unrecognized', {
      intent,
      subsystem: 'shell.shell_state',
    });
    return { action: { type: 'none' }, delegateWorkspaceCanvas: false };
  }

  if (intent.startsWith('app.')) {
    const action = mapAppIntent(raw);
    if (action.type !== 'none') {
      logShellCanvasAudit('intent_parsed', {
        source: 'json',
        intent,
        subsystem: 'shell',
      });
      return { action, delegateWorkspaceCanvas: false };
    }
    return { action: { type: 'none' }, delegateWorkspaceCanvas: false };
  }
  return { action: { type: 'none' }, delegateWorkspaceCanvas: !intent.startsWith('app.') };
}
