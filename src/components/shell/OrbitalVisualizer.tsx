import { motion } from 'motion/react';
import type { SystemStatus } from '../../shell/appTypes';

/** Voice pipeline: emerald = listening + speaking; amber/yellow = reasoning (processing). */
function orbitalPalette(status: SystemStatus): {
  barMuted: string;
  barPeak: string;
  glow: string;
  logoBg: string;
  logoText: string;
  statusLabel: string;
  statusDetail: string;
  statusHeadingClass: string;
} {
  switch (status) {
    case 'listening':
      return {
        barMuted: '#34d399',
        barPeak: '#059669',
        glow: 'rgba(16, 185, 129, 0.18)',
        logoBg: 'bg-emerald-500',
        logoText: 'text-white',
        statusLabel: 'Listening',
        statusDetail: 'Capturing your voice',
        statusHeadingClass: 'text-emerald-600',
      };
    case 'processing':
      return {
        barMuted: '#fde047',
        barPeak: '#eab308',
        glow: 'rgba(234, 179, 8, 0.2)',
        logoBg: 'bg-amber-400',
        logoText: 'text-amber-950',
        statusLabel: 'Reasoning',
        statusDetail: 'Model is thinking',
        statusHeadingClass: 'text-amber-600',
      };
    case 'speaking':
      return {
        barMuted: '#34d399',
        barPeak: '#059669',
        glow: 'rgba(16, 185, 129, 0.2)',
        logoBg: 'bg-emerald-500',
        logoText: 'text-white',
        statusLabel: 'Speaking',
        statusDetail: 'Voice response',
        statusHeadingClass: 'text-emerald-600',
      };
    case 'error':
      return {
        barMuted: '#fca5a5',
        barPeak: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.15)',
        logoBg: 'bg-red-500',
        logoText: 'text-white',
        statusLabel: 'Error',
        statusDetail: 'Something went wrong',
        statusHeadingClass: 'text-red-600',
      };
    case 'offline':
      return {
        barMuted: '#a1a1aa',
        barPeak: '#71717a',
        glow: 'rgba(113, 113, 122, 0.12)',
        logoBg: 'bg-[var(--panel-surface)]',
        logoText: 'text-white',
        statusLabel: 'Offline',
        statusDetail: 'Voice unavailable',
        statusHeadingClass: 'text-[var(--panel-text-muted)]',
      };
    default:
      return {
        barMuted: '#6ee7b7',
        barPeak: '#10b981',
        glow: 'rgba(16, 185, 129, 0.08)',
        logoBg: 'bg-emerald-500',
        logoText: 'text-white',
        statusLabel: 'Ready',
        statusDetail: 'Tap and hold to speak',
        statusHeadingClass: 'text-emerald-600',
      };
  }
}

export function OrbitalVisualizer({ isActive, status }: { isActive: boolean; status: SystemStatus }) {
  const bars = 48;
  const palette = orbitalPalette(status);

  return (
    <div className="relative w-32 h-40 md:w-40 md:h-48 shrink-0">
      <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center text-center px-0.5">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-0.5">
            <span className="font-bold text-xs md:text-sm tracking-widest" style={{ color: 'var(--panel-text-muted)' }}>AI</span>
            <div className={`${palette.logoBg} ${palette.logoText} px-1 py-px rounded text-xs md:text-sm font-bold transition-colors duration-300`}>
              O
            </div>
            <div className={`${palette.logoBg} ${palette.logoText} px-1 py-px rounded text-xs md:text-sm font-bold transition-colors duration-300`}>
              S
            </div>
          </div>
          <div className="flex flex-col items-center text-center max-w-[9rem] md:max-w-[11rem] mx-auto">
            <span className={`inline-block pl-[0.15em] text-[8px] md:text-[10px] font-black uppercase tracking-[0.18em] tabular-nums ${palette.statusHeadingClass}`}>
              {palette.statusLabel}
            </span>
            <span className="mt-px px-0.5 text-[8px] md:text-[9px] font-medium leading-tight" style={{ color: 'var(--panel-text-muted)' }}>
              {palette.statusDetail}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-[1] overflow-visible">
        {Array.from({ length: bars }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 md:w-1 rounded-full left-1/2 bottom-1/2"
            style={{
              height: '24%',
              transform: `translateX(-50%) rotate(${(i * 360) / bars}deg) translateY(-108%)`,
              transformOrigin: 'bottom center',
            }}
            animate={isActive ? {
              height: ['24%', `${24 + Math.random() * 28}%`, '24%'],
              opacity: [0.45, 1, 0.45],
              backgroundColor: [palette.barMuted, palette.barPeak, palette.barMuted],
            } : {
              height: '24%',
              opacity: 0.18,
              backgroundColor: palette.barMuted,
            }}
            transition={{
              duration: 0.5 + Math.random() * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div
        className="absolute left-1/2 top-1/2 z-0 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl pointer-events-none"
        style={{ backgroundColor: palette.glow }}
        animate={isActive ? {
          scale: [1, 1.06, 1],
          opacity: [0.28, 0.65, 0.28],
        } : {
          scale: 1,
          opacity: 0.2,
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}
