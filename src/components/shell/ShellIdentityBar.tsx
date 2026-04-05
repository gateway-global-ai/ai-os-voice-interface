/**
 * Shell disclosure: AIOS logo, actor, interaction mode, workspace gate, active canvas/intent.
 * Full-width top bar (not a floating card) for consistent app chrome.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { User } from 'lucide-react';
import type { LocalModelReadiness } from '../../local-llm/types';
import type { WorkspaceState } from '../../shell/workspaceState';
import { LocalModelStatusChip } from './LocalModelStatusChip';

type Props = {
  actorLabel: string;
  shellInteractionMode: 'voice' | 'chat';
  actorModeLabel: string;
  workspaceState: WorkspaceState;
  intentSummary?: string;
  localModelReadiness?: LocalModelReadiness | null;
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
  localModelReadiness,
}: Props) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-[var(--z-shell-header)] h-[var(--shell-header-height)] flex items-center border-b border-white/20 bg-white/10 backdrop-blur-sm px-3 md:px-6"
      role="banner"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex w-full min-w-0 items-center gap-2 md:gap-3 text-[11px] md:text-xs text-zinc-700"
      >
        <div className="shrink-0">
          <img
            src="/aios-logo.png"
            alt="AIOS"
            className="h-7 w-auto max-h-[calc(var(--shell-header-height)-0.5rem)] object-contain md:h-8"
            width={120}
            height={32}
            decoding="async"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4 overflow-hidden">
          <div className="hidden min-w-0 shrink sm:flex sm:items-center sm:gap-1.5">
            <span className="font-bold uppercase tracking-wider text-zinc-400">Shell</span>
            <span className="font-medium text-emerald-800">{shellInteractionMode}</span>
            <span className="text-zinc-300">·</span>
            <span className="truncate text-zinc-600">{actorModeLabel}</span>
          </div>

          <span className="hidden h-3 w-px shrink-0 bg-zinc-300/60 sm:block" aria-hidden />

          <span className="hidden min-w-0 truncate text-zinc-600 md:inline" title={workspaceLabel(workspaceState)}>
            {workspaceLabel(workspaceState)}
          </span>

          <span className="hidden h-3 w-px shrink-0 bg-zinc-300/60 md:block" aria-hidden />

          <LocalModelStatusChip readiness={localModelReadiness ?? null} />

          {intentSummary ? (
            <>
              <span className="hidden h-3 w-px shrink-0 bg-zinc-300/60 lg:block" aria-hidden />
              <span
                className="ml-auto hidden min-w-0 max-w-[min(40%,12rem)] truncate font-mono text-[10px] text-zinc-500 lg:inline"
                title={intentSummary}
              >
                {intentSummary}
              </span>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-l border-zinc-200/70 pl-2 md:gap-2.5 md:pl-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/90 text-white shadow-sm md:h-9 md:w-9">
            <User className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-1.5">
            <span className="hidden font-bold uppercase tracking-wider text-zinc-400 sm:inline">Actor</span>
            <span className="truncate font-semibold text-zinc-900">{actorLabel}</span>
          </div>
        </div>
      </motion.div>
    </header>
  );
}
