/**
 * Top-right power control + System Controls panel (grid layout, logout, voice route).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Power,
  User,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { UserProfilePanel } from './UserProfilePanel';
import { AdminPanel } from './AdminPanel';
import type { OnboardingProfile } from '../../onboarding/onboardingState';

export type PowerChromeState = 'idle' | 'signed_in' | 'disconnected';

type Props = {
  /** Blue: not signed in; green: signed in; red: disconnected. */
  powerState: PowerChromeState;
  /** Shown next to the power icon when `powerState === 'signed_in'`. */
  userName?: string | null;
  onLogout?: () => void;
  /** Called after the user saves their profile, so the parent can refresh the displayed name. */
  onProfileUpdate?: (profile: OnboardingProfile) => void;
  /** Opens the voice/settings control panel (rendered at App.tsx root to avoid stacking context trap). */
  onOpenVoiceSettings?: () => void;
  /** Opens the podcast library overlay. */
  onOpenPodcasts?: () => void;
  /** Opens the session knowledge panel. */
  onOpenKnowledge?: () => void;
  /** Opens the workspace hub surface. */
  onOpenWorkspace?: () => void;
  /** Opens the appearance overlay. */
  onOpenAppearance?: () => void;
  /** Opens the transparency drawer. */
  onOpenTransparency?: () => void;
  /** Current governed voice route label shown in header controls. */
  currentVoiceLabel?: string;
  /** Current live voice status exposed by the shell cue controller. */
  currentVoiceStatus?: string;
  /** Optional current cue label when shell audio is active or ready to replay. */
  currentCueLabel?: string;
};

function tileButtonClass(disabled?: boolean) {
  return cn(
    'flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all',
    !disabled && 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70',
    disabled && 'cursor-not-allowed opacity-40',
  );
}

function tileButtonStyle() {
  return {
    background: 'var(--panel-surface)',
    border: '1px solid var(--panel-border)',
    color: 'var(--panel-text)',
  };
}

function tileIconWrapStyle() {
  return {
    background: 'var(--panel-accent-bg)',
    border: '1px solid var(--panel-accent-border)',
    color: 'var(--panel-accent-text)',
  };
}

function powerButtonStyle(powerState: PowerChromeState) {
  const shared = {
    background: 'var(--panel-bg)',
    color: 'var(--panel-text)',
  };

  if (powerState === 'disconnected') {
    return {
      ...shared,
      border: '2px solid rgba(248,113,113,0.5)',
      boxShadow: '0 0 22px rgba(248,113,113,0.4)',
      color: '#fecaca',
    };
  }

  if (powerState === 'signed_in') {
    return {
      ...shared,
      border: '2px solid rgba(52,211,153,0.45)',
      boxShadow: '0 0 22px rgba(52,211,153,0.35)',
      color: '#d1fae5',
    };
  }

  return {
    ...shared,
    border: '2px solid rgba(56,189,248,0.45)',
    boxShadow: '0 0 22px rgba(56,189,248,0.35)',
    color: '#e0f2fe',
  };
}

async function tryQuitApplication(): Promise<void> {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  } catch {
    try {
      window.close();
    } catch {
      /* noop */
    }
  }
}

export function ShellSystemControls({
  powerState,
  userName,
  onLogout,
  onProfileUpdate,
  onOpenVoiceSettings,
  onOpenPodcasts,
  onOpenKnowledge,
  onOpenWorkspace,
  onOpenAppearance,
  onOpenTransparency,
  currentVoiceLabel,
  currentVoiceStatus,
  currentCueLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'user' | 'admin' | null>(null);
  useEffect(() => {
    if (!open) {
      setActivePanel(null);
    }
  }, [open]);

  const handlePowerClick = () => {
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
        {powerState === 'signed_in' && userName ? (
          <span
            className="max-w-[min(42vw,9rem)] truncate text-right text-[10px] font-semibold sm:text-[11px] md:max-w-[10rem]"
            style={{ color: 'var(--panel-text)' }}
            title={userName}
          >
            {userName}
          </span>
        ) : null}
        <button
          type="button"
          onClick={handlePowerClick}
          title={
            powerState === 'disconnected'
              ? 'System disconnected'
              : powerState === 'signed_in'
                ? 'System controls'
                : 'Not signed in — system controls'
          }
          className={cn(
            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-transform hover:scale-[1.04] active:scale-[0.98]',
          )}
          style={powerButtonStyle(powerState)}
        >
          <Power className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.25} aria-hidden />
          <span className="sr-only">System power and controls</span>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[var(--z-shell-modal-backdrop)] backdrop-blur-[2px]"
            style={{ background: 'rgba(2,6,23,0.55)' }}
            role="presentation"
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="system-controls-title"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed right-3 top-[calc(var(--shell-header-height)+0.5rem)] z-[var(--z-shell-system-controls)] max-h-[min(85vh,calc(100vh-var(--shell-header-height)-1.25rem))] w-[min(26rem,calc(100vw-1.5rem))] overflow-y-auto rounded-3xl p-4 shadow-2xl backdrop-blur-md md:right-6"
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              boxShadow: '0 24px 80px rgba(2,6,23,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Persistent header: title/status + close */}
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="system-controls-title"
                  className="text-sm font-bold uppercase tracking-[0.2em]"
                  style={{ color: 'var(--panel-text-muted)' }}
                >
                  System controls
                </h2>
                {activePanel === null ? (
                  <p className="mt-1 text-xs" style={{ color: 'var(--panel-text-muted)' }}>
                    {powerState === 'disconnected'
                      ? 'Connection lost — some actions are limited.'
                      : powerState === 'signed_in'
                        ? 'Signed in — navigation and account controls available.'
                        : 'Not signed in — complete onboarding to unlock account actions.'}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 transition-colors hover:opacity-90"
                style={{
                  background: 'var(--panel-surface)',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--panel-text-muted)',
                }}
                onClick={() => setOpen(false)}
                aria-label="Close system controls"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Animated body: main controls ↔ sub-panels */}
            <AnimatePresence mode="wait" initial={false}>
              {activePanel === 'user' ? (
                <UserProfilePanel
                  key="user-panel"
                  onBack={() => setActivePanel(null)}
                  powerState={powerState}
                  onSave={(profile) => onProfileUpdate?.(profile)}
                  onCreateAccount={() => setOpen(false)}
                />
              ) : activePanel === 'admin' ? (
                <AdminPanel key="admin-panel" onBack={() => setActivePanel(null)} />
              ) : (
                <motion.div
                  key="main-controls"
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                >
                  <div
                    className="mb-3 rounded-2xl px-3 py-3"
                    style={{
                      background: 'var(--panel-surface)',
                      border: '1px solid var(--panel-border)',
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: 'var(--panel-text-muted)' }}
                    >
                      Voice runtime
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: 'var(--panel-accent-bg)',
                          border: '1px solid var(--panel-accent-border)',
                          color: 'var(--panel-accent-text)',
                        }}
                      >
                        {currentVoiceLabel ?? 'Voice route'}
                      </span>
                      {currentVoiceStatus ? (
                        <span className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>
                          {currentVoiceStatus}
                        </span>
                      ) : null}
                    </div>
                    {currentCueLabel ? (
                      <p className="mt-2 text-xs" style={{ color: 'var(--panel-text)' }}>
                        Cue: {currentCueLabel}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Profile — opens user profile editor */}
                    <button
                      type="button"
                      className={tileButtonClass()}
                      style={tileButtonStyle()}
                      onClick={() => setActivePanel('user')}
                      title="Edit your profile"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl" style={tileIconWrapStyle()}>
                        <User className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--panel-text)' }}>
                        Profile
                      </span>
                    </button>

                    {/* Scripts — opens narration/voice script editor */}
                    <button
                      type="button"
                      className={tileButtonClass()}
                      style={tileButtonStyle()}
                      onClick={() => setActivePanel('admin')}
                      title="Edit narration and voice scripts"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl" style={tileIconWrapStyle()}>
                        <Settings className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--panel-text)' }}>
                        Scripts
                      </span>
                    </button>
                  </div>

                  <div
                    className="mt-3 rounded-2xl px-3 py-3 text-xs leading-relaxed"
                    style={{
                      background: 'var(--panel-surface)',
                      border: '1px solid var(--panel-border)',
                      color: 'var(--panel-text-muted)',
                    }}
                  >
                    Voice, appearance, podcasts, and other shell routes are opened from the header system shell menu.
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {onLogout && powerState === 'signed_in' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onLogout();
                        }}
                        className="flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors hover:opacity-90"
                        style={{
                          background: 'rgba(127,29,29,0.22)',
                          border: '1px solid rgba(248,113,113,0.35)',
                          color: '#fecaca',
                        }}
                      >
                        <LogOut className="h-4 w-4" aria-hidden />
                        Log out
                      </button>
                    ) : (
                      <div
                        className="flex min-h-[2.75rem] items-center justify-center rounded-xl text-xs"
                        style={{
                          background: 'var(--panel-surface)',
                          border: '1px solid var(--panel-border)',
                          color: 'var(--panel-text-muted)',
                        }}
                      >
                        Log out unavailable
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        void tryQuitApplication();
                      }}
                      className="flex min-h-[2.75rem] items-center justify-center rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
                      style={{
                        background: 'var(--panel-surface)',
                        border: '1px solid var(--panel-border)',
                        color: 'var(--panel-text)',
                      }}
                    >
                      Quit app
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* AI Library full-screen overlay is rendered from App.tsx root level
          to avoid the motion.div stacking context trap (see overlay-positioning.mdc) */}
    </>
  );
}


