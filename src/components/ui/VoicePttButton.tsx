/**
 * Shadcn-inspired primary control: rectangular PTT with ring + animated glow.
 * Sizing: control is 40% of footer width × 50% of --shell-footer-height; “AI OS COMMAND CENTER” sits below.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { PointerEvent } from 'react';
import { Mic } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';
import type { CommandRailState } from '../shell/commandRailTypes';

type Props = {
  rail: CommandRailState;
  isPTTActive: boolean;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
};

const railActivity = (s: CommandRailState['systemStatus']) =>
  s === 'listening' || s === 'processing' || s === 'speaking';

export function VoicePttButton({
  rail,
  isPTTActive,
  onPointerDown,
  onPointerUp,
}: Props) {
  const busy = railActivity(rail.systemStatus);
  const glowKey = isPTTActive ? 'press' : busy ? 'busy' : 'idle';

  return (
    <div className="pointer-events-auto flex w-[40%] min-w-[9rem] max-w-[28rem] shrink-0 flex-col items-center gap-1">
      <motion.button
        type="button"
        aria-label="Push to talk — AI OS Command Center. Hold to speak."
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          'flex h-[calc(var(--shell-footer-height)*0.5)] w-full items-center justify-center overflow-hidden rounded-xl border px-2 text-white transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white/90',
          isPTTActive
            ? 'border-emerald-300/80 bg-emerald-400'
            : 'border-emerald-700/25 bg-emerald-600 hover:bg-emerald-500',
        )}
        animate={
          glowKey === 'press'
            ? {
                boxShadow:
                  '0 0 0 1px rgba(52, 211, 153, 0.5), 0 0 32px 4px rgba(52, 211, 153, 0.55), 0 0 64px 8px rgba(16, 185, 129, 0.35)',
              }
            : glowKey === 'busy'
              ? {
                  boxShadow:
                    '0 0 0 1px rgba(16, 185, 129, 0.35), 0 0 24px 2px rgba(16, 185, 129, 0.4)',
                }
              : {
                  boxShadow: [
                    '0 0 0 1px rgba(16, 185, 129, 0.2), 0 0 18px 0 rgba(16, 185, 129, 0.25)',
                    '0 0 0 1px rgba(52, 211, 153, 0.35), 0 0 28px 4px rgba(52, 211, 153, 0.35)',
                    '0 0 0 1px rgba(16, 185, 129, 0.2), 0 0 18px 0 rgba(16, 185, 129, 0.25)',
                  ],
                }
        }
        transition={
          glowKey === 'idle'
            ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.25, ease: 'easeOut' }
        }
        whileTap={{ scale: 0.98 }}
      >
        <Mic
          className={cn(
            'h-5 w-5 shrink-0 sm:h-6 sm:w-6',
            (isPTTActive || busy) && 'animate-pulse',
          )}
          aria-hidden
        />
      </motion.button>
      <p className="pointer-events-none m-0 w-full whitespace-nowrap text-center text-[8px] font-black uppercase leading-tight tracking-[0.12em] text-zinc-500 sm:text-[9px] sm:tracking-[0.14em]">
        AI OS COMMAND CENTER
      </p>
    </div>
  );
}
