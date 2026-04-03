/**
 * Shell disclosure: actor, interaction mode, workspace gate, active canvas/intent.
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
    <div className="absolute top-6 right-6 z-[var(--z-shell-chrome)] max-w-[min(100%,20rem)]">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-3 pr-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20 shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex flex-col gap-0.5 text-left">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Actor</span>
            <span className="text-sm font-bold text-zinc-900 truncate">{actorLabel}</span>
          </div>
          <div className="flex flex-wrap gap-x-2 text-[10px] text-zinc-500">
            <span className="font-bold uppercase tracking-wider text-zinc-400">Shell</span>
            <span className="text-emerald-700 font-semibold">{shellInteractionMode}</span>
            <span className="text-zinc-300">·</span>
            <span>{actorModeLabel}</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-snug">{workspaceLabel(workspaceState)}</p>
          {intentSummary ? (
            <p className="text-[10px] font-mono text-zinc-600 truncate" title={intentSummary}>
              {intentSummary}
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
