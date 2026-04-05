/**
 * Governed footer — single primary action: PTT (voice) or send (chat).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { FormEvent, PointerEvent } from 'react';
import { MessageSquare, Home, Menu as MenuIcon, Send, Circle } from 'lucide-react';
import { motion } from 'motion/react';
import { VoicePttButton } from '../ui/VoicePttButton';
import type { CommandRailState } from './commandRailTypes';

export type { CommandRailState };

type Props = {
  rail: CommandRailState;
  mode: 'voice' | 'chat';
  menuOpen: boolean;
  chatInput: string;
  onChatInputChange: (v: string) => void;
  onChatSubmit: (e: FormEvent) => void;
  onToggleVoiceChat: () => void;
  onMenuClick: () => void;
  isPTTActive: boolean;
  onPTTDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPTTUp: (e: PointerEvent<HTMLButtonElement>) => void;
  displayStatus: string;
  statusTone: 'ok' | 'error' | 'muted';
};

/** Activity sub-state for the rail debug line (not overall health — use `statusTone` for that). */
function mapAppStatus(s: CommandRailState['systemStatus']): string {
  switch (s) {
    case 'listening':
      return 'listening';
    case 'processing':
      return 'processing';
    case 'speaking':
      return 'speaking';
    default:
      return 'idle';
  }
}

export function CommandRail({
  rail,
  mode,
  menuOpen,
  chatInput,
  onChatInputChange,
  onChatSubmit,
  onToggleVoiceChat,
  onMenuClick,
  isPTTActive,
  onPTTDown,
  onPTTUp,
  displayStatus,
  statusTone,
}: Props) {
  const voicePrimary = rail.mode === 'voice' && rail.primaryAction === 'ptt';
  const chatPrimary = rail.mode === 'chat' && rail.primaryAction === 'send';
  const railLabel = mapAppStatus(rail.systemStatus);
  const pulseStatusDot =
    statusTone === 'ok' && rail.systemStatus === 'idle';

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[var(--z-shell-footer)] min-h-[var(--shell-footer-height)] border-t border-zinc-200 bg-white/90 backdrop-blur-xl">
      {voicePrimary ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <VoicePttButton
            rail={rail}
            isPTTActive={isPTTActive}
            onPointerDown={onPTTDown}
            onPointerUp={onPTTUp}
          />
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-[var(--shell-footer-height)] items-center justify-between gap-2 px-3 py-2 md:px-6 md:py-2">
        <div className="flex shrink-0 items-center gap-3 md:gap-4">
          {mode === 'chat' ? (
            <button
              type="button"
              onClick={onToggleVoiceChat}
              className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 text-zinc-500 transition-colors hover:text-emerald-600"
            >
              <Home className="h-9 w-9" aria-hidden />
              <span className="text-[9px] font-bold uppercase tracking-widest">Home</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleVoiceChat}
              className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 text-zinc-500 transition-colors hover:text-emerald-600"
            >
              <MessageSquare className="h-9 w-9" aria-hidden />
              <span className="text-[9px] font-bold uppercase tracking-widest">Chat</span>
            </button>
          )}
          <button
            type="button"
            onClick={onMenuClick}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 transition-colors ${menuOpen ? 'text-emerald-600' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <MenuIcon className="h-9 w-9" aria-hidden />
            <span className="text-[9px] font-bold uppercase tracking-widest">Menu</span>
          </button>
        </div>

        <div className="min-w-0 flex-1 px-2">
          {chatPrimary ? (
            <form
              onSubmit={onChatSubmit}
              className="mx-auto flex w-full max-w-xl items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                placeholder="Type a message…"
                className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-2xl bg-emerald-500 p-3 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                aria-label="Send"
              >
                <Send className="h-8 w-8 text-white" aria-hidden />
              </button>
            </form>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <div className="hidden items-center gap-2 border-l border-zinc-200 pl-3 sm:flex md:pl-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                Status
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  statusTone === 'error'
                    ? 'text-red-500'
                    : statusTone === 'muted'
                      ? 'text-zinc-400'
                      : 'text-emerald-600'
                }`}
              >
                {displayStatus}
              </span>
            </div>
            <motion.div
              animate={pulseStatusDot ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
              transition={
                pulseStatusDot ? { duration: 2, repeat: Infinity } : { duration: 0.2 }
              }
            >
              <Circle
                className={`h-2.5 w-2.5 fill-current ${
                  statusTone === 'error'
                    ? 'text-red-500'
                    : statusTone === 'muted'
                      ? 'text-zinc-400'
                      : 'text-emerald-600'
                }`}
              />
            </motion.div>
            {rail.intent ? (
              <span
                className="max-w-[100px] truncate font-mono text-[9px] text-zinc-400"
                title={rail.intent}
              >
                {rail.intent}
              </span>
            ) : null}
            <span className="hidden font-mono text-[9px] text-zinc-300 lg:inline">
              {railLabel}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

