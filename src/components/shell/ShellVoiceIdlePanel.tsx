/**
 * Minimal orientation when the voice shell is idle (no canvas overlay).
 * **AMD-2026-012 §5** — copy differs for **new** vs **returning** (less scaffolding when returning).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { SessionEntryClassification } from '../../shell/sessionEntryClassification';
import type { WorkspaceState } from '../../shell/workspaceState';
import { workspaceNextStepHint } from '../../shell/shellSurfaceLabels';

type Props = {
  workspaceState: WorkspaceState;
  /** First classification step at Shell entry (§5.1 / §5.2). */
  sessionEntry: SessionEntryClassification;
  onOpenMenu: () => void;
};

export function ShellVoiceIdlePanel({ workspaceState, sessionEntry, onOpenMenu }: Props) {
  const extra = workspaceNextStepHint(workspaceState);
  const title =
    sessionEntry === 'new' ? 'You’re in AI OS' : 'Welcome back';
  const body =
    sessionEntry === 'new'
      ? 'This is the voice-first shell: speak with the assistant, or open Menu for settings and Google Workspace (calendar, mail, and more) when connected.'
      : 'Speak to continue, or open Menu for settings and Google Workspace when connected.';

  return (
    <div className="max-w-md px-6 text-center space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="text-xs text-zinc-600 leading-relaxed">{body}</p>
        {extra ? <p className="text-xs text-zinc-500 leading-relaxed">{extra}</p> : null}
      </div>
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="w-full max-w-xs rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-zinc-800"
        >
          Open Menu
        </button>
        <p className="text-[10px] text-zinc-400">Or hold the microphone button below to speak.</p>
      </div>
    </div>
  );
}
