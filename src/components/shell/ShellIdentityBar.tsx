/**
 * Shell disclosure: actor, interaction mode, workspace gate, active canvas/intent.
 * Full-width top bar (not a floating card) for consistent app chrome.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { User } from 'lucide-react';
import type { WorkspaceState } from '../../shell/workspaceState';

type Props = {
  actorLabel: string;
  shellInteractionMode: 'voice' | 'chat';
  actorModeLabel: string;
  workspaceState: WorkspaceState;
  intentSummary?: string;
};

function workspaceLabel(ws: WorkspaceState): string {
  switch (ws) {
    case 'connected':
      return 'Workspace: connected';
    case 'not_configured':
      return 'Workspace: not configured';
    case 'connecting':
      return 'Workspace: connecting';
    case 'error':
      return 'Workspace: error';
    case 'unknown':
      return 'Workspace: not connected';
    default:
      return 'Workspace: unknown';
  }
}

export function ShellIdentityBar({
  actorLabel,
  shellInteractionMode,
  actorModeLabel,
  workspaceState,
  intentSummary,
}: Props) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-[var(--z-shell-header)] h-[var(--shell-header-height)] flex items-center border-b border-white/20 bg-white/10 backdrop-blur-sm px-3 md:px-6"
      role="banner"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex w-full min-w-0 items-center gap-2 md:gap-4 text-[11px] md:text-xs text-zinc-700"
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/90 text-white shadow-sm">
            <User className="h-3.5 w-3.5" aria-hidden />
          </div>
          <span className="hidden font-bold uppercase tracking-wider text-zinc-400 sm:inline">Actor</span>
          <span className="truncate font-semibold text-zinc-900">{actorLabel}</span>
        </div>

        <span className="hidden h-3 w-px shrink-0 bg-zinc-300/60 sm:block" aria-hidden />

        <div className="hidden min-w-0 shrink sm:flex sm:items-center sm:gap-1.5">
          <span className="font-bold uppercase tracking-wider text-zinc-400">Shell</span>
          <span className="font-medium text-emerald-800">{shellInteractionMode}</span>
          <span className="text-zinc-300">·</span>
          <span className="truncate text-zinc-600">{actorModeLabel}</span>
        </div>

        <span className="hidden h-3 w-px shrink-0 bg-zinc-300/60 md:block" aria-hidden />

        <span className="hidden min-w-0 truncate text-zinc-600 md:inline" title={workspaceLabel(workspaceState)}>
          {workspaceLabel(workspaceState)}
        </span>

        {intentSummary ? (
          <>
            <span className="hidden h-3 w-px shrink-0 bg-zinc-300/60 lg:block" aria-hidden />
            <span
              className="ml-auto hidden min-w-0 max-w-[40%] truncate font-mono text-[10px] text-zinc-500 lg:inline"
              title={intentSummary}
            >
              {intentSummary}
            </span>
          </>
        ) : null}
      </motion.div>
    </header>
  );
}
