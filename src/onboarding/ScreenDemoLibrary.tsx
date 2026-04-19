/**
 * ScreenDemoLibrary — persistent demo hub accessible from the entry landing and main shell menu.
 *
 * Wraps the three onboarding demo screens (Model Arena, Intent Engine, 3P Formula) as a
 * re-enterable full-screen overlay. Users can reach this at any time — not just during
 * the one-time onboarding sequence.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Zap, Target, ChevronRight } from 'lucide-react';
import { ScreenModelArena } from './ScreenModelArena';
import { ScreenIntentDemo } from './ScreenIntentDemo';
import { Screen3PIntro } from './Screen3PIntro';

type DemoId = 'model_arena' | 'intent_demo' | 'three_p_intro';

const DEMOS: { id: DemoId; title: string; subtitle: string; icon: React.ReactNode; accent: string }[] = [
  {
    id: 'model_arena',
    title: 'Intelligence Stack',
    subtitle: 'Meet your local and cloud AI models and see how governed responses work.',
    icon: <Cpu className="h-6 w-6" />,
    accent: 'from-cyan-500/20 to-blue-500/20 border-cyan-400/30',
  },
  {
    id: 'intent_demo',
    title: 'Intent Engine',
    subtitle: 'See how every word you speak becomes a structured, routable intent.',
    icon: <Zap className="h-6 w-6" />,
    accent: 'from-violet-500/20 to-purple-500/20 border-violet-400/30',
  },
  {
    id: 'three_p_intro',
    title: '3P Success Formula',
    subtitle: 'Purpose, Plan, and Pressure — the three signals that keep you on target.',
    icon: <Target className="h-6 w-6" />,
    accent: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/30',
  },
];

interface Props {
  commanderName?: string;
  onClose: () => void;
}

export function ScreenDemoLibrary({ commanderName = 'Commander', onClose }: Props) {
  const [active, setActive] = useState<DemoId | null>(null);

  return (
    <motion.div
      key="demo-library-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[200] flex flex-col backdrop-blur-md overflow-y-auto"
      style={{ background: 'var(--panel-bg)' }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--panel-border)' }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/80">
            AI Library
          </p>
          {active ? (
            <button
              type="button"
              onClick={() => setActive(null)}
              className="mt-0.5 text-xs transition-colors hover:opacity-80"
              style={{ color: 'var(--panel-text-muted)' }}
            >
              ← Back to library
            </button>
          ) : (
            <h2 className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
              Intelligence Demos
            </h2>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
          style={{
            background: 'var(--panel-surface)',
            borderColor: 'var(--panel-border)',
            color: 'var(--panel-text-muted)',
          }}
          aria-label="Close AI Library"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {active === null ? (
            <motion.div
              key="demo-picker"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="p-6 md:p-10 max-w-3xl mx-auto w-full"
            >
              <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                These demos are always available. Use them to explore how AI OS works, run a quick
                capability check, or show someone the system.
              </p>

              <div className="flex flex-col gap-4">
                {DEMOS.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => setActive(demo.id)}
                    className={`group flex items-center gap-5 rounded-2xl border bg-gradient-to-br p-5 text-left transition-all hover:scale-[1.01] hover:brightness-110 ${demo.accent}`}
                  >
                    <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl transition-colors"
                      style={{ background: 'var(--panel-surface)', color: 'var(--panel-text)' }}>
                      {demo.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold" style={{ color: 'var(--panel-heading)' }}>{demo.title}</p>
                      <p className="mt-1 text-sm leading-snug" style={{ color: 'var(--panel-text-muted)' }}>{demo.subtitle}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 transition-colors" style={{ color: 'var(--panel-text-muted)' }} />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : active === 'model_arena' ? (
            <motion.div
              key="demo-model-arena"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <ScreenModelArena
                commanderName={commanderName}
                onNext={() => setActive(null)}
              />
            </motion.div>
          ) : active === 'intent_demo' ? (
            <motion.div
              key="demo-intent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <ScreenIntentDemo
                commanderName={commanderName}
                onNext={() => setActive(null)}
              />
            </motion.div>
          ) : active === 'three_p_intro' ? (
            <motion.div
              key="demo-three-p"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <Screen3PIntro
                commanderName={commanderName}
                onNext={() => setActive(null)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
