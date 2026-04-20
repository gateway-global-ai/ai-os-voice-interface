/**
 * Governed footer — single primary action: PTT (voice) or send (chat).
 * Left nav cluster removed per plan — mode toggle is inline.
 * Passively inherits all surface/text from CSS custom properties.
 */

import type { FormEvent, PointerEvent, ReactNode } from 'react';
import { MessageSquare, Home, Send, Mic, Circle, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { VoicePttButton } from '../ui/VoicePttButton';
import type { CommandRailState } from './commandRailTypes';
import type { ShellMenuRecord } from '../../shell/shellMenuContract';

export type { CommandRailState };

type Props = {
  rail: CommandRailState;
  mode: 'voice' | 'chat';
  /** @deprecated kept for backward compatibility — no longer renders menu button */
  menuOpen?: boolean;
  chatInput: string;
  onChatInputChange: (v: string) => void;
  onChatSubmit: (e: FormEvent) => void;
  onChatMicPress: () => void;
  onChatMicRelease: () => void;
  onToggleVoiceChat: () => void;
  /** @deprecated kept for backward compatibility — no longer renders menu button */
  onMenuClick?: () => void;
  isPTTActive: boolean;
  onPTTDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPTTUp: (e: PointerEvent<HTMLButtonElement>) => void;
  displayStatus: string;
  displayStatusDetail?: string;
  loyaltySummary?: string;
  statusTone: 'ok' | 'error' | 'muted';
  showDiagnosticsChrome: boolean;
  footerMenuRecord?: ShellMenuRecord;
  footerMenuOpen?: boolean;
  onToggleFooterMenu?: () => void;
};

function mapRailStatus(s: CommandRailState['systemStatus']): string {
  switch (s) {
    case 'listening':  return 'listening';
    case 'processing': return 'processing';
    case 'speaking':   return 'speaking';
    default:           return 'idle';
  }
}

const statusColor = (tone: Props['statusTone']) =>
  tone === 'error' ? '#ef4444' : tone === 'muted' ? 'var(--panel-text-muted)' : '#34d399';

export function CommandRail({
  rail, mode,
  chatInput, onChatInputChange, onChatSubmit,
  onChatMicPress, onChatMicRelease,
  onToggleVoiceChat,
  isPTTActive, onPTTDown, onPTTUp,
  displayStatus, displayStatusDetail,
  loyaltySummary,
  statusTone, showDiagnosticsChrome,
  footerMenuRecord,
  footerMenuOpen = false,
  onToggleFooterMenu,
}: Props) {
  const voicePrimary = rail.mode === 'voice' && rail.primaryAction === 'ptt';
  const chatPrimary  = rail.mode === 'chat'  && rail.primaryAction === 'send';
  const railLabel    = mapRailStatus(rail.systemStatus);
  const pulseStatusDot = statusTone === 'ok' && rail.systemStatus === 'idle';
  const dotColor = statusColor(statusTone);

  return (
    <footer
      style={{
        background: 'var(--panel-bg)',
        borderTop: '1px solid var(--panel-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      className="fixed bottom-0 left-0 right-0 z-[var(--z-shell-footer)] min-h-[var(--shell-footer-height)]"
    >
      {/* PTT button floats centered above the rail row */}
      {voicePrimary && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <VoicePttButton
            rail={rail}
            isPTTActive={isPTTActive}
            onPointerDown={onPTTDown}
            onPointerUp={onPTTUp}
          />
        </div>
      )}

      <div className="relative z-10 flex min-h-[var(--shell-footer-height)] items-center justify-between gap-2 px-4 py-2 md:px-6">

        {/* ── Left: voice↔chat toggle ───────────────────────────────── */}
        <div className="flex shrink-0 items-center">
          <ModeToggleButton
            mode={mode}
            onClick={onToggleVoiceChat}
          />
        </div>

        {/* ── Centre: chat input or PTT spacer ─────────────────────── */}
        <div className="min-w-0 flex-1 px-2">
          {chatPrimary && (
            <form onSubmit={onChatSubmit} className="mx-auto flex w-full max-w-xl items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                placeholder="Type a message…"
                style={{
                  background: 'var(--panel-input-bg)',
                  border: '1px solid var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
                className="min-w-0 flex-1 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:opacity-40"
              />
              <button
                type="button"
                onMouseDown={onChatMicPress}
                onMouseUp={onChatMicRelease}
                onMouseLeave={onChatMicRelease}
                onTouchStart={onChatMicPress}
                onTouchEnd={onChatMicRelease}
                onTouchCancel={onChatMicRelease}
                style={isPTTActive || rail.systemStatus === 'listening' ? {
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                } : {
                  background: 'var(--panel-surface)',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--panel-text-muted)',
                }}
                className="shrink-0 rounded-xl p-2.5 transition hover:opacity-80"
                aria-label="Hold to talk"
              >
                <Mic size={18} />
              </button>
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-emerald-500 p-2.5 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
                aria-label="Send"
              >
                <Send size={18} className="text-white" />
              </button>
            </form>
          )}
        </div>

        {/* ── Right: knowledge + status readout ───────────────────── */}
        <div className="flex shrink-0 items-center gap-2">
          {footerMenuRecord && onToggleFooterMenu ? (
            <button
              type="button"
              onClick={onToggleFooterMenu}
              className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:opacity-80"
              style={{
                background: footerMenuOpen ? 'var(--panel-accent-bg)' : 'var(--panel-surface)',
                border: `1px solid ${footerMenuOpen ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
                color: footerMenuOpen ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)',
              }}
              aria-label="Open user surface menu"
              title="Open user surface menu"
            >
              <UserRound size={17} />
            </button>
          ) : null}

          <div
            style={{ borderLeft: '1px solid var(--panel-border)' }}
            className="hidden items-center gap-2 pl-3 sm:flex"
          >
            <div className="flex flex-col items-end gap-0.5">
              <span style={{ color: 'var(--panel-text-muted)' }}
                    className="text-[9px] font-black uppercase tracking-widest">
                Status
              </span>
              <span style={{ color: dotColor }}
                    className="text-[9px] font-bold uppercase tracking-widest">
                {displayStatus}
              </span>
              {loyaltySummary ? (
                <span
                  style={{ color: 'var(--panel-text-muted)' }}
                  className="max-w-[10rem] text-right text-[8px] font-bold uppercase tracking-[0.16em] leading-snug"
                >
                  {loyaltySummary}
                </span>
              ) : null}
              {displayStatusDetail && (
                <span style={{ color: 'var(--panel-text-muted)' }}
                      className="max-w-[10rem] text-right text-[8px] font-medium leading-snug">
                  {displayStatusDetail}
                </span>
              )}
            </div>
            <motion.div
              animate={pulseStatusDot ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
              transition={pulseStatusDot ? { duration: 2, repeat: Infinity } : { duration: 0.2 }}
            >
              <Circle className="h-2 w-2 fill-current" style={{ color: dotColor }} />
            </motion.div>
            {showDiagnosticsChrome && rail.intent && (
              <span style={{ color: 'var(--panel-text-muted)' }}
                    className="max-w-[80px] truncate font-mono text-[8px]"
                    title={rail.intent}>
                {rail.intent}
              </span>
            )}
            {showDiagnosticsChrome && (
              <span style={{ color: 'var(--panel-text-muted)' }}
                    className="hidden font-mono text-[8px] lg:inline">
                {railLabel}
              </span>
            )}
          </div>
        </div>

      </div>
    </footer>
  );
}

/* ── Mode toggle button ────────────────────────────────────────────────── */
function ModeToggleButton({ mode, onClick }: { mode: 'voice' | 'chat'; onClick: () => void }) {
  const isChatMode = mode === 'chat';
  return (
    <button
      type="button"
      onClick={onClick}
      title={isChatMode ? 'Switch to Voice' : 'Switch to Chat'}
      className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 transition hover:opacity-80"
      style={{ color: 'var(--panel-text-muted)' }}
    >
      {isChatMode ? <Home size={18} /> : <MessageSquare size={18} />}
      <span className="text-[8px] font-bold uppercase tracking-widest">
        {isChatMode ? 'Voice' : 'Chat'}
      </span>
    </button>
  );
}

/* ── Unused NavButton kept for external import compatibility ──────────── */
export function NavButton({
  icon, label, active, onClick,
}: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? {
        color: 'var(--panel-accent-text)',
        background: 'var(--panel-accent-bg)',
      } : {
        color: 'var(--panel-text-muted)',
      }}
      className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 transition hover:opacity-80"
    >
      {icon}
      <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}
