/**
 * Governed footer — single primary action: PTT (voice) or send (chat).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { FormEvent, PointerEvent } from 'react';
import { MessageSquare, Home, Menu as MenuIcon, Mic, Send, Circle } from 'lucide-react';
import { motion } from 'motion/react';

export type CommandRailState = {
  mode: 'voice' | 'chat';
  primaryAction: 'ptt' | 'send';
  systemStatus: 'idle' | 'listening' | 'processing' | 'speaking';
  intent?: string;
};

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
    <footer
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-zinc-200 z-[var(--z-shell-footer)] flex flex-col"
      style={{ minHeight: 'var(--shell-footer-height)' }}
    >
      <div className="flex items-center justify-between px-4 md:px-8 py-3 gap-2 flex-1">
        <div className="flex items-center gap-4 md:gap-8 shrink-0">
          {mode === 'chat' ? (
            <button
              type="button"
              onClick={onToggleVoiceChat}
              className="flex flex-col items-center gap-1 text-zinc-400 hover:text-emerald-600 transition-colors"
            >
              <Home className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Home</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleVoiceChat}
              className="flex flex-col items-center gap-1 text-zinc-400 hover:text-emerald-600 transition-colors"
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Chat</span>
            </button>
          )}
        </div>

        <div className="flex-1 flex justify-center min-w-0 px-2">
          {voicePrimary ? (
            <div className="flex flex-col items-center">
              <button
                type="button"
                onPointerDown={onPTTDown}
                onPointerUp={onPTTUp}
                onPointerCancel={onPTTUp}
                className={`
                  w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300
                  ${isPTTActive
                    ? 'bg-emerald-400 scale-90 shadow-[0_0_40px_rgba(52,211,153,0.4)]'
                    : 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]'}
                `}
              >
                <Mic className={`w-8 h-8 md:w-10 md:h-10 text-white ${isPTTActive ? 'animate-pulse' : ''}`} />
              </button>
              <span className="mt-2 text-[10px] uppercase tracking-[0.15em] font-black text-zinc-500 text-center">
                AI OS Voice Command
              </span>
            </div>
          ) : null}

          {chatPrimary ? (
            <form onSubmit={onChatSubmit} className="flex gap-2 w-full max-w-xl items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 min-w-0 bg-zinc-100 border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-zinc-900 text-sm"
              />
              <button
                type="submit"
                className="shrink-0 p-3 bg-emerald-500 rounded-2xl hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                aria-label="Send"
              >
                <Send className="w-6 h-6 text-white" />
              </button>
            </form>
          ) : null}
        </div>

        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          <button
            type="button"
            onClick={onMenuClick}
            className={`flex flex-col items-center gap-1 transition-colors ${menuOpen ? 'text-emerald-600' : 'text-zinc-400 hover:text-zinc-900'}`}
          >
            <MenuIcon className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Menu</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 pl-3 md:pl-6 border-l border-zinc-200">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest font-black text-zinc-300">Status</span>
              <span
                className={`text-[10px] uppercase tracking-widest font-bold ${
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
                className={`w-2 h-2 fill-current ${
                  statusTone === 'error'
                    ? 'text-red-500'
                    : statusTone === 'muted'
                      ? 'text-zinc-400'
                      : 'text-emerald-600'
                }`}
              />
            </motion.div>
            {rail.intent ? (
              <span className="text-[9px] max-w-[100px] truncate text-zinc-400 font-mono" title={rail.intent}>
                {rail.intent}
              </span>
            ) : null}
            <span className="text-[9px] text-zinc-300 font-mono hidden lg:inline">{railLabel}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
