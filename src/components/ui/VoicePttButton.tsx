/**
 * Primary voice control — compact pill with ambient glow.
 * Sizing: 40% of footer width × 50% of --shell-footer-height.
 * Colors and glow: `src/index.css` (--shell-ptt-* + .voice-ptt-btn*).
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
  const busy = isActive(rail.systemStatus);
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
          'voice-ptt-btn flex h-[calc(var(--shell-footer-height)*0.52)] w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 transition-colors',
          glowKey === 'idle' && 'voice-ptt-btn--idle',
          glowKey === 'busy' && 'voice-ptt-btn--busy',
          glowKey === 'press' && 'voice-ptt-btn--pressed',
        )}
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
