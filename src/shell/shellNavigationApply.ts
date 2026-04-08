/**
 * Single apply path for shell navigation actions (voice, chat, agent INTENT_JSON, UI).
 * Surfaces interim authority for `set_surface_mode`; other actions pass through.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { InterimShellAuthority } from './shellAuthority';
import { allowShellSurfaceTransition } from './shellAuthority';
import type { ShellNavigationAction, ShellTargetMode } from './shellIntentRouter';
import type { ShellSurfaceMode } from './shellSurfaceMode';
import type { ShellStateCommand } from './shellStateCommands';

export type ShellApplyHandlers = {
  setSurfaceMode: (mode: ShellSurfaceMode) => void;
  setVoiceChatMode: (mode: 'voice' | 'chat') => void;
  setAppTargetMode: (mode: ShellTargetMode) => void;
  openWorkspace: () => void;
};

export type ShellApplyResult =
  | { ok: true }
  | { ok: false; userMessage: string };

/** Map deterministic spoken/typed shell commands to the same actions as agent `app.shell.*`. */
export function shellStateCommandToNavigationAction(cmd: ShellStateCommand): ShellNavigationAction {
  if (cmd.type === 'surface') {
    return { type: 'set_surface_mode', mode: cmd.mode };
  }
  return { type: 'set_voice_chat_mode', mode: cmd.mode };
}

/**
 * Returns a denial message when the action must not be applied, or `null` when allowed.
 */
export function getShellNavigationDenialMessage(
  action: ShellNavigationAction,
  authority: InterimShellAuthority,
): string | null {
  if (action.type !== 'set_surface_mode') return null;
  const gate = allowShellSurfaceTransition(action.mode, authority);
  return gate.ok === false ? gate.userMessage : null;
}

/**
 * Applies a shell navigation action (caller must have already checked denial, or use `tryApplyShellNavigationAction`).
 */
export function applyShellNavigationAction(action: ShellNavigationAction, h: ShellApplyHandlers): void {
  switch (action.type) {
    case 'none':
      return;
    case 'set_surface_mode':
      h.setSurfaceMode(action.mode);
      return;
    case 'set_voice_chat_mode':
      h.setVoiceChatMode(action.mode);
      return;
    case 'set_mode':
      h.setAppTargetMode(action.mode);
      return;
    case 'open_workspace':
      h.openWorkspace();
      return;
  }
}

/** Authority check + apply in one step (deterministic paths, footer UI). */
export function tryApplyShellNavigationAction(
  action: ShellNavigationAction,
  authority: InterimShellAuthority,
  h: ShellApplyHandlers,
): ShellApplyResult {
  const denial = getShellNavigationDenialMessage(action, authority);
  if (denial) return { ok: false, userMessage: denial };
  applyShellNavigationAction(action, h);
  return { ok: true };
}
