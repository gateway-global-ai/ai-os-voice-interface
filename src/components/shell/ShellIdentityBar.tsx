/**
 * Shell disclosure: AIOS logo, actor, interaction mode, workspace gate, active canvas/intent.
 * Full-width top bar (not a floating card) for consistent app chrome.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { User } from 'lucide-react';
import type { LocalModelReadiness } from '../../local-llm/types';
import { buildPrimarySecondaryDisclosureLine } from '../../compliance/spec009PrimaryDisclosure';
import type { CanvasView } from '../../shellCanvas/canvasTypes';
import type { WorkspaceState } from '../../shell/workspaceState';
import { canvasSurfaceLabelForShell, workspacePrimaryLine } from '../../shell/shellSurfaceLabels';
import { LocalModelStatusChip } from './LocalModelStatusChip';

type Props = {
  /** Shown only in diagnostics mode — neutral session disclosure (not a verified identity). */
  sessionLabel: string;
  shellInteractionMode: 'voice' | 'chat';
  /** Second token on the diagnostics Shell line (e.g. this tab). */
  sessionContextLabel: string;
  workspaceState: WorkspaceState;
  /** Active Workspace canvas surface, if any — drives primary lane disclosure. */
  canvasView?: CanvasView | null;
  /** False when browser speech recognition is unavailable (use Chat). */
  voiceInputAvailable: boolean;
  intentSummary?: string;
  localModelReadiness?: LocalModelReadiness | null;
  /**
   * When true, primary strip may append local-model capability (AIOS-SPEC-009 §12.2) if policy requires
   * local interpretation and Ollama is not running_ready.
   */
  resolvedIntentRequiresLocalModel?: boolean;
  /** When false, hide operator/diagnostics strip (workspace, intent, local model, session column). */
  showDiagnosticsChrome: boolean;
};

/** In diagnostics, hide local-model chip unless there is a meaningful runtime signal. */
function showLocalModelDiagnosticsChip(readiness: LocalModelReadiness | null | undefined): boolean {
  if (!readiness) return false;
  return readiness.status === 'running_ready' || readiness.status === 'degraded';
}

function workspaceLabel(ws: WorkspaceState): string {
  switch (ws) {
    case 'connected':
      return 'Workspace: connected';
    case 'auth_required':
      return 'Workspace: sign in required';
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
  sessionLabel,
  shellInteractionMode,
  sessionContextLabel,
  workspaceState,
  canvasView,
  voiceInputAvailable,
  intentSummary,
  localModelReadiness,
  resolvedIntentRequiresLocalModel = false,
  showDiagnosticsChrome,
}: Props) {
  const lane = shellInteractionMode === 'voice' ? 'Voice' : 'Chat';
  const surfaceTitle = canvasSurfaceLabelForShell(canvasView ?? null);
  const workspaceLine = workspacePrimaryLine(workspaceState);
  const voiceNote =
    shellInteractionMode === 'voice' && !voiceInputAvailable
      ? 'Voice input unavailable — use Chat.'
      : null;

  const primaryHomeNull = !showDiagnosticsChrome && (canvasView == null || canvasView === undefined);
  const workspaceQuiet = workspaceState === 'connected';
  /** Home + primary: show nothing except logo when Workspace is connected and voice is OK. */
  const primaryHomeMinimal =
    primaryHomeNull && workspaceQuiet && !voiceNote;
  const primaryHomeSecondaryParts = primaryHomeNull
    ? [voiceNote, !workspaceQuiet ? workspaceLine : null].filter(Boolean) as string[]
    : [];
  const primarySurfaceLine1 = surfaceTitle ? `${lane} · ${surfaceTitle}` : `${lane} · Main shell`;
  /** Canvas / non-home primary: SPEC-009 §12.2-aligned secondary line (Workspace + voice + optional capability). */
  const primarySurfaceLine2 = buildPrimarySecondaryDisclosureLine({
    workspaceState,
    voiceInputAvailable,
    shellInteractionMode,
    localModelReadiness,
    resolvedIntentRequiresLocalModel,
  });
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
          {showDiagnosticsChrome ? (
            <>
              <div className="hidden min-w-0 shrink sm:flex sm:items-center sm:gap-1.5">
                <span className="font-bold uppercase tracking-wider text-zinc-400">Shell</span>
                <span className="font-medium text-emerald-800">{shellInteractionMode}</span>
                <span className="text-zinc-300">·</span>
                <span className="truncate text-zinc-600">{sessionContextLabel}</span>
              </div>

              <span className="hidden h-3 w-px shrink-0 bg-zinc-300/60 sm:block" aria-hidden />

              <span
                className="hidden min-w-0 truncate text-zinc-600 md:inline"
                title={workspaceLabel(workspaceState)}
              >
                {workspaceLabel(workspaceState)}
              </span>

              {showLocalModelDiagnosticsChip(localModelReadiness) ? (
                <>
                  <span className="hidden h-3 w-px shrink-0 bg-zinc-300/60 md:block" aria-hidden />
                  <LocalModelStatusChip readiness={localModelReadiness ?? null} />
                </>
              ) : null}

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
            </>
          ) : primaryHomeMinimal ? null : (
            <div className="hidden min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden sm:flex max-w-[min(52vw,22rem)]">
              {primaryHomeNull ? (
                <>
                  <span className="truncate text-[10px] font-semibold text-zinc-800">{lane}</span>
                  <span
                    className="truncate text-[10px] text-zinc-500"
                    title={primaryHomeSecondaryParts.join(' — ')}
                  >
                    {primaryHomeSecondaryParts.join(' — ')}
                  </span>
                </>
              ) : (
                <>
                  <span className="truncate text-[10px] font-semibold text-zinc-800" title={primarySurfaceLine1}>
                    {primarySurfaceLine1}
                  </span>
                  <span
                    className="truncate text-[10px] text-zinc-500"
                    title={primarySurfaceLine2}
                  >
                    {primarySurfaceLine2}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {showDiagnosticsChrome ? (
          <div className="flex shrink-0 items-center gap-2 border-l border-zinc-200/70 pl-2 md:gap-2.5 md:pl-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/90 text-white shadow-sm md:h-9 md:w-9">
              <User className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" aria-hidden />
            </div>
            <div className="flex min-w-0 flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-1.5">
              <span className="hidden font-bold uppercase tracking-wider text-zinc-400 sm:inline">Session</span>
              <span className="truncate font-semibold text-zinc-900" title={sessionLabel}>
                {sessionLabel}
              </span>
            </div>
          </div>
        ) : null}
      </motion.div>
    </header>
  );
}
