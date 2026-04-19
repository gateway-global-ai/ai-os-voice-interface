/**
 * Primary voice control — compact pill with ambient glow.
 * Sizing: 40% of footer width × 50% of --shell-footer-height.
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

const isActive = (s: CommandRailState['systemStatus']) =>
  s === 'listening' || s === 'processing' || s === 'speaking';

export function VoicePttButton({ rail, isPTTActive, onPointerDown, onPointerUp }: Props) {
  const busy    = isActive(rail.systemStatus);
  const glowKey = isPTTActive ? 'press' : busy ? 'busy' : 'idle';

  return (
    <div className="pointer-events-auto flex w-[40%] min-w-[9rem] max-w-[26rem] shrink-0 flex-col items-center gap-1.5">
      <motion.button
        type="button"
        aria-label="Push to talk. Hold to speak."
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        className={cn(
          'flex h-[calc(var(--shell-footer-height)*0.52)] w-full items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 text-white transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          isPTTActive
            ? 'border-emerald-300/80 bg-emerald-400'
            : 'border-emerald-700/30 bg-emerald-600 hover:bg-emerald-500',
        )}
        animate={
          glowKey === 'press'
            ? { boxShadow: '0 0 0 1px rgba(52,211,153,0.5), 0 0 32px 4px rgba(52,211,153,0.55), 0 0 64px 8px rgba(16,185,129,0.35)' }
            : glowKey === 'busy'
              ? { boxShadow: '0 0 0 1px rgba(16,185,129,0.35), 0 0 24px 2px rgba(16,185,129,0.4)' }
              : { boxShadow: [
                    '0 0 0 1px rgba(16,185,129,0.2), 0 0 18px 0 rgba(16,185,129,0.25)',
                    '0 0 0 1px rgba(52,211,153,0.35), 0 0 28px 4px rgba(52,211,153,0.35)',
                    '0 0 0 1px rgba(16,185,129,0.2), 0 0 18px 0 rgba(16,185,129,0.25)',
                  ] }
        }
        transition={
          glowKey === 'idle'
            ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.25, ease: 'easeOut' }
        }
        whileTap={{ scale: 0.97 }}
      >
        <Mic
          className={cn('h-5 w-5 shrink-0 sm:h-6 sm:w-6', (isPTTActive || busy) && 'animate-pulse')}
          aria-hidden
        />
        <span className="text-[10px] font-black uppercase tracking-[0.12em] opacity-80">
          {isPTTActive ? 'Listening…' : busy ? rail.systemStatus : 'Hold to speak'}
        </span>
      </motion.button>

      <div className="pointer-events-none mt-1 flex items-center gap-1.5 opacity-75">
        <span
          style={{ color: 'var(--panel-text-muted)' }}
          className="text-[7px] font-semibold uppercase tracking-[0.18em]"
        >
          Powered by
        </span>
        <div className="flex items-center gap-1">
          <span
            style={{ color: 'var(--panel-text-muted)' }}
            className="text-[10px] font-bold"
          >
            CLEAR
          </span>
          <span
            style={{ color: 'var(--panel-accent-text)' }}
            className="text-[10px] font-bold"
          >
            VOICE
          </span>
          <div
            style={{
              background: 'var(--panel-accent-bg)',
              color: 'var(--panel-accent-text)',
              border: '1px solid var(--panel-accent-border)',
            }}
            className="rounded px-0.5 py-[1px] text-[7px] font-bold"
          >
            AI
          </div>
        </div>
      </div>
    </div>
  );
}
