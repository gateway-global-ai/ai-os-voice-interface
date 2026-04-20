/**
 * ShellCommandContext — orientation prompts shown in the empty shell center.
 * Cycles through intent-driven suggestions so users know what to do on arrival.
 * Disappears once the user sends their first message.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const PROMPTS = [
  'Hold to speak and declare your next goal',
  'Say: "What\'s on my agenda today?"',
  'Say: "Add a task — launch campaign by Friday"',
  'Say: "Open my email"',
  'Say: "What should I focus on right now?"',
];

const CYCLE_MS = 4000;

interface Props {
  /** Hides the component when true — call once the first message is sent. */
  hidden?: boolean;
}

export function ShellCommandContext({ hidden = false }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (hidden) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % PROMPTS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [hidden]);

  if (hidden) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-6 select-none pointer-events-none">
      {/* Outer ring pulse */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full border border-cyan-400/20 animate-ping" style={{ animationDuration: '2.5s' }} />
        <div className="h-10 w-10 rounded-full border border-cyan-400/35 bg-cyan-400/5 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-cyan-400/60" />
        </div>
      </div>

      {/* Cycling prompt */}
      <div className="h-8 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="text-sm text-zinc-500 tracking-wide text-center px-4"
          >
            {PROMPTS[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Static hint */}
      <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-700">
        AI OS Command Center
      </p>
    </div>
  );
}
