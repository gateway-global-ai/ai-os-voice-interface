/**
 * Deterministic shell-state commands (not skills / not workspace canvas intents).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { ShellSurfaceMode } from './shellSurfaceMode';

export type ShellStateCommand =
  | { type: 'surface'; mode: ShellSurfaceMode }
  | { type: 'app_mode'; mode: 'voice' | 'chat' };

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Match user utterance for core shell transitions (voice parity).
 * Returns null if no shell command — caller may route to LLM or workspace canvas.
 */
export function tryParseShellStateCommand(raw: string): ShellStateCommand | null {
  const t = norm(raw);
  if (!t) return null;

  if (/\bswitch\s+to\s+chat\b/.test(t) || /^use\s+chat$/.test(t) || /^chat\s+mode$/.test(t)) {
    return { type: 'app_mode', mode: 'chat' };
  }
  if (/\bswitch\s+to\s+voice\b/.test(t) || /^use\s+voice$/.test(t) || /^voice\s+mode$/.test(t)) {
    return { type: 'app_mode', mode: 'voice' };
  }

  if (
    /^(enter\s+)?developer(\s+mode)?$/.test(t) ||
    /^enter\s+developer\s+mode$/.test(t) ||
    /^developer\s+mode$/.test(t)
  ) {
    return { type: 'surface', mode: 'developer' };
  }
  if (
    /^exit\s+developer(\s+mode)?$/.test(t) ||
    /^leave\s+developer(\s+mode)?$/.test(t) ||
    /^back\s+to\s+primary$/.test(t) ||
    /^primary\s+mode$/.test(t)) {
    return { type: 'surface', mode: 'primary' };
  }

  if (
    /^(enter\s+)?operator(\s+mode)?$/.test(t) ||
    /^enter\s+operator\s+mode$/.test(t) ||
    /^operator\s+mode$/.test(t) ||
    /^diagnostics(\s+mode)?$/.test(t) ||
    /^enter\s+diagnostics$/.test(t)
  ) {
    return { type: 'surface', mode: 'operator' };
  }
  if (
    /^exit\s+operator(\s+mode)?$/.test(t) ||
    /^exit\s+diagnostics$/.test(t) ||
    /^leave\s+operator(\s+mode)?$/.test(t) ||
    /^leave\s+diagnostics$/.test(t)
  ) {
    return { type: 'surface', mode: 'primary' };
  }

  return null;
}

export function shellStateCommandAck(cmd: ShellStateCommand): string {
  if (cmd.type === 'app_mode') {
    return cmd.mode === 'chat' ? 'Switching to chat.' : 'Switching to voice.';
  }
  switch (cmd.mode) {
    case 'primary':
      return 'Shell is in primary mode.';
    case 'developer':
      return 'Developer shell mode on.';
    case 'operator':
      return 'Operator diagnostics mode on.';
    default:
      return 'Shell mode updated.';
  }
}
