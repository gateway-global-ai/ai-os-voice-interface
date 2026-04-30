/**
 * Shell disclosure/player bar.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  ListMusic,
  Mic,
  MicOff,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { LocalModelReadiness } from '../../local-llm/types';
import type { CanvasView } from '../../shellCanvas/canvasTypes';
import type { WorkspaceState } from '../../shell/workspaceState';
import type { ShellMenuRecord } from '../../shell/shellMenuContract';
import { LocalModelStatusChip } from './LocalModelStatusChip';
import { ShellSystemControls, type PowerChromeState } from './ShellSystemControls';

type CueSummary = {
  id: string;
  label: string;
  status: 'queued' | 'playing' | 'played' | 'stopped';
};

type Props = {
  sessionLabel: string;
  shellInteractionMode: 'voice' | 'chat';
  sessionContextLabel: string;
  workspaceState: WorkspaceState;
  canvasView?: CanvasView | null;
  voiceInputAvailable: boolean;
  intentSummary?: string;
  localModelReadiness?: LocalModelReadiness | null;
  showDiagnosticsChrome: boolean;
  commanderName?: string;
  onOpenSystemControls?: () => void;
  onOpenTransparency?: () => void;
  headerMenuRecord?: ShellMenuRecord;
  headerMenuOpen: boolean;
  onToggleHeaderMenu: () => void;
  onCloseHeaderMenu: () => void;
  powerChromeState: PowerChromeState;
  voiceModelLabel: string;
  /** Journey / shell-state primary label for the center pill (replaces voice route as headline when set). */
  headerPillLabel?: string;
  /** Extended title for the center pill (e.g. voice route + disclosure). */
  headerPillTitle?: string;
  loyaltySummary: string;
  availableSkillsCount: number;
  statusSubtitle?: string;
  playbackActive: boolean;
  micEnabled: boolean;
  speakerEnabled: boolean;
  currentCueLabel?: string;
  audioCues: CueSummary[];
  onTogglePlayback?: () => void;
  onToggleMic?: () => void;
  onToggleSpeaker?: () => void;
};

function workspaceLabel(ws: WorkspaceState): string {
  switch (ws) {
    case 'connected':
      return 'Workspace connected';
    case 'auth_required':
      return 'Workspace auth required';
    case 'not_configured':
      return 'Workspace not configured';
    case 'connecting':
      return 'Workspace connecting';
    case 'error':
      return 'Workspace error';
    case 'unknown':
      return 'Workspace not connected';
    default:
      return 'Workspace unknown';
  }
}

function showLocalModelDiagnosticsChip(readiness: LocalModelReadiness | null | undefined): boolean {
  if (!readiness) return false;
  return readiness.status === 'running_ready' || readiness.status === 'degraded';
}

function playerButtonStyle(active = false) {
  return {
    color: active ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)',
    border: `1px solid ${active ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
    background: active ? 'var(--panel-accent-bg)' : 'var(--panel-bg)',
  };
}

function crumbButtonStyle() {
  return {
    color: 'var(--panel-accent-text)',
    background: 'var(--panel-accent-bg)',
    border: '1px solid var(--panel-accent-border)',
  };
}

export function ShellIdentityBar({
  sessionLabel,
  shellInteractionMode,
  sessionContextLabel,
  workspaceState,
  canvasView: _canvasView,
  voiceInputAvailable,
  intentSummary: _intentSummary,
  localModelReadiness,
  showDiagnosticsChrome,
  commanderName,
  onOpenSystemControls,
  onOpenTransparency,
  headerMenuRecord,
  headerMenuOpen,
  onToggleHeaderMenu,
  onCloseHeaderMenu,
  powerChromeState,
  voiceModelLabel,
  headerPillLabel,
  headerPillTitle,
  loyaltySummary: _loyaltySummary,
  availableSkillsCount: _availableSkillsCount,
  statusSubtitle,
  playbackActive,
  micEnabled,
  speakerEnabled,
  currentCueLabel,
  audioCues,
  onTogglePlayback,
  onToggleMic,
  onToggleSpeaker,
}: Props) {
  const [showCueMenu, setShowCueMenu] = useState(false);
  const voiceNote =
    shellInteractionMode === 'voice' && !voiceInputAvailable
      ? 'Voice input unavailable'
      : shellInteractionMode === 'chat'
        ? 'Chat lane active'
        : 'Voice lane active';
  const modelBadgeLabel = voiceModelLabel.replace(/\s+Voice$/i, '');
  const centerPillLabel = headerPillLabel?.trim() || modelBadgeLabel;
  const centerPillTitle =
    headerPillTitle?.trim() ||
    (onOpenTransparency ? 'Open transparency details' : undefined);

  useEffect(() => {
    if (!showCueMenu && !headerMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCueMenu(false);
        onCloseHeaderMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [headerMenuOpen, onCloseHeaderMenu, showCueMenu]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[var(--z-shell-header)] flex h-[var(--shell-header-height)] items-center px-3 md:px-5"
      style={{
        background: 'var(--panel-bg)',
        borderBottom: '1px solid var(--panel-border)',
        backdropFilter: 'blur(14px)',
      }}
      role="banner"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
      >
        <div className="shrink-0 flex items-center gap-0 pl-1 select-none">
          <span className="font-black tracking-tight text-xl leading-none" style={{ color: 'var(--panel-heading)' }}>AI</span>
          <span className="relative inline-flex items-center justify-center mx-[1px]">
            <span className="block h-[1.15rem] w-[1.15rem] rounded-full bg-gradient-to-br from-blue-400 via-cyan-500 to-indigo-600 shadow-[0_0_12px_rgba(96,165,250,0.6)]" />
          </span>
          <span className="font-black tracking-tight text-xl leading-none" style={{ color: 'var(--panel-heading)' }}>S</span>
        </div>

        <div className="relative flex min-w-0 justify-center">
          <div
            className="relative flex min-w-0 w-full max-w-[min(78vw,44rem)] items-start justify-end px-1 py-1"
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              boxShadow: 'none',
            }}
          >
            <div className="pointer-events-none absolute left-1/2 top-1/2 hidden min-w-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center px-4 md:flex">
              <button
                type="button"
                onClick={onOpenTransparency}
                disabled={!onOpenTransparency}
                className="pointer-events-auto inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                style={crumbButtonStyle()}
                title={centerPillTitle}
              >
                <span className="truncate">{centerPillLabel}</span>
              </button>
            </div>

            <div className="relative z-10 flex shrink-0 items-center gap-2.5 pr-1">
                <button
                  type="button"
                  onClick={onTogglePlayback}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:opacity-95"
                  style={playerButtonStyle(playbackActive)}
                  aria-label={playbackActive ? 'Stop audio playback' : 'Play current cue'}
                  title={playbackActive ? 'Stop audio playback' : 'Play current cue'}
                >
                  {playbackActive ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button
                  type="button"
                  onClick={onToggleMic}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:opacity-95"
                  style={playerButtonStyle(micEnabled)}
                  aria-label={micEnabled ? 'Turn microphone off' : 'Turn microphone on'}
                  title={micEnabled ? 'Turn microphone off' : 'Turn microphone on'}
                >
                  {micEnabled ? <Mic size={15} /> : <MicOff size={15} />}
                </button>
                <button
                  type="button"
                  onClick={onToggleSpeaker}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:opacity-95"
                  style={playerButtonStyle(speakerEnabled)}
                  aria-label={speakerEnabled ? 'Turn speaker off' : 'Turn speaker on'}
                  title={speakerEnabled ? 'Turn speaker off' : 'Turn speaker on'}
                >
                  {speakerEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCloseHeaderMenu();
                    setShowCueMenu((current) => !current);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:opacity-95"
                  style={playerButtonStyle(showCueMenu)}
                  aria-label="Open audio cue menu"
                  title="Open audio cue menu"
                >
                  <ListMusic size={15} />
                </button>
                {headerMenuRecord ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCueMenu(false);
                      onToggleHeaderMenu();
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:opacity-95"
                    style={playerButtonStyle(headerMenuOpen)}
                    aria-label="Open system shell menu"
                    title="Open system shell menu"
                  >
                    <LayoutGrid size={15} />
                  </button>
                ) : null}

              <AnimatePresence>
                {showCueMenu ? (
                  <div className="absolute top-[calc(100%+0.45rem)] right-0 z-[var(--z-shell-system-controls)] w-[min(24rem,calc(100vw-2rem))]">
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="overflow-hidden rounded-2xl"
                      style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        boxShadow: '0 24px 80px rgba(2,6,23,0.45)',
                      }}
                    >
                      <div className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--panel-text-muted)' }}>
                          Audio cue
                        </p>
                        <div
                          className="mt-3 rounded-xl px-3 py-2"
                          style={{
                            background: 'var(--panel-surface)',
                            border: '1px solid var(--panel-border)',
                          }}
                        >
                          <p className="text-xs font-semibold" style={{ color: 'var(--panel-heading)' }}>
                            {currentCueLabel ?? voiceModelLabel}
                          </p>
                          <p className="mt-1 text-[11px]" style={{ color: 'var(--panel-text-muted)' }}>
                            {currentCueLabel ? `Current cue · ${statusSubtitle || voiceNote}` : statusSubtitle || voiceNote}
                          </p>
                        </div>
                        <div className="mt-3 space-y-2">
                          {audioCues.length > 0 ? (
                            audioCues.map((cue) => (
                              <div
                                key={cue.id}
                                className="rounded-xl px-3 py-2"
                                style={{
                                  background: cue.status === 'playing' ? 'var(--panel-accent-bg)' : 'var(--panel-surface)',
                                  border: `1px solid ${cue.status === 'playing' ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
                                }}
                              >
                                <p className="text-sm font-medium" style={{ color: 'var(--panel-heading)' }}>
                                  {cue.label}
                                </p>
                                <p className="mt-1 text-[11px]" style={{ color: 'var(--panel-text-muted)' }}>
                                  {cue.status}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div
                              className="rounded-xl px-3 py-2 text-xs"
                              style={{
                                background: 'var(--panel-surface)',
                                border: '1px solid var(--panel-border)',
                                color: 'var(--panel-text-muted)',
                              }}
                            >
                              No queued audio.
                            </div>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  </div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showDiagnosticsChrome ? (
            <div className="hidden min-w-0 items-center gap-2 xl:flex">
              <span className="truncate text-[10px]" style={{ color: 'var(--panel-text-muted)' }} title={workspaceLabel(workspaceState)}>
                {workspaceLabel(workspaceState)}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--panel-text-muted)' }}>
                {sessionContextLabel}
              </span>
              {showLocalModelDiagnosticsChip(localModelReadiness) ? (
                <LocalModelStatusChip readiness={localModelReadiness ?? null} />
              ) : null}
              <span className="truncate text-[10px] font-semibold" style={{ color: 'var(--panel-text)' }} title={sessionLabel}>
                {sessionLabel}
              </span>
            </div>
          ) : null}

          <ShellSystemControls
            powerState={powerChromeState}
            userName={commanderName}
            onOpenMenu={onOpenSystemControls}
          />
        </div>
      </motion.div>
    </header>
  );
}
