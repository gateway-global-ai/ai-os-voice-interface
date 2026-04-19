/**
 * Screen3PIntro — "Your Success Formula"
 *
 * Introduces the 3P Focus System: Purpose / Plan / Pressure.
 * Lets the user toggle 3P Focus Mode on/off, persisted to localStorage.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Map,
  Flame,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  MessageSquareText,
  Telescope,
} from 'lucide-react';
import { SovereignButton, SovereignTitle } from '../ui-core';
import { is3PEnabled, set3PEnabled } from './threePPreference';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface Screen3PIntroProps {
  commanderName: string;
  onNext: () => void;
}

// ─── Pillar card data ──────────────────────────────────────────────────────────

const PILLARS = [
  {
    key: 'purpose',
    label: 'Purpose',
    icon: <Compass size={22} className="text-cyan-300" />,
    color: { border: 'border-cyan-400/30', bg: 'bg-cyan-500/[0.07]', text: 'text-cyan-300', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.18)]' },
    description:
      'What you are ultimately trying to achieve. Your "north star" — the reason behind every task. AI OS listens for purpose signals in everything you say.',
    examples: ['"I want to launch my product by Q3"', '"My goal is to improve team productivity"'],
  },
  {
    key: 'plan',
    label: 'Plan',
    icon: <Map size={22} className="text-violet-300" />,
    color: { border: 'border-violet-400/30', bg: 'bg-violet-500/[0.07]', text: 'text-violet-300', glow: 'shadow-[0_0_20px_rgba(167,139,250,0.18)]' },
    description:
      'Active steps, projects, and tasks you mention. AI OS tracks what you say you will do — then surfaces it when context matters.',
    examples: ['"I\'m working on the pitch deck"', '"I need to follow up with the client"'],
  },
  {
    key: 'pressure',
    label: 'Pressure',
    icon: <Flame size={22} className="text-amber-300" />,
    color: { border: 'border-amber-400/30', bg: 'bg-amber-500/[0.07]', text: 'text-amber-300', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.18)]' },
    description:
      'Timelines, deadlines, and urgency signals. When you mention a deadline, AI OS adjusts prioritisation and can proactively surface overdue commitments.',
    examples: ['"This is due Friday"', '"We have a board meeting next week"'],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function Screen3PIntro({ commanderName, onNext }: Screen3PIntroProps) {
  const [enabled, setEnabled] = useState(() => is3PEnabled());

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    set3PEnabled(next);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-cyan-400 text-sm uppercase tracking-[0.3em] mb-1">Planet AI OS</p>
        <SovereignTitle level={2}>Your Success Formula</SovereignTitle>
        <p className="mt-2 text-sm max-w-xl mx-auto" style={{ color: 'var(--panel-text-muted)' }}>
          AI OS monitors every conversation for three signals — Purpose, Plan, and Pressure —
          and uses them to keep you focused on what matters most,{' '}
          {commanderName || 'Commander'}.
        </p>
      </div>

      {/* 3P diagram */}
      <div className="rounded-2xl border p-5"
        style={{ background: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Telescope size={16} className="text-zinc-500" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            How it works
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
          {/* Daily chat bubble */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="rounded-xl border px-4 py-3 text-center max-w-[180px]"
              style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
              <MessageSquareText size={20} className="text-zinc-400 mx-auto mb-1" />
              <p className="text-xs font-medium" style={{ color: 'var(--panel-text-muted)' }}>Daily Conversations</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--panel-text-muted)' }}>Everything you say or type</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center px-3 text-zinc-600">
            <ChevronRight size={18} className="rotate-90 sm:rotate-0" />
          </div>

          {/* 3P extraction box */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.05] px-5 py-3 text-center">
              <p className="text-xs font-bold text-cyan-300 mb-2">3P Extraction Engine</p>
              <div className="flex items-center justify-center gap-3">
                {[
                  { label: 'P', color: 'text-cyan-300 border-cyan-400/40',   hint: 'urpose' },
                  { label: 'P', color: 'text-violet-300 border-violet-400/40', hint: 'lan' },
                  { label: 'P', color: 'text-amber-300 border-amber-400/40',  hint: 'ressure' },
                ].map(({ label, color, hint }, i) => (
                  <div key={i} className={`flex flex-col items-center rounded-lg border ${color} px-2 py-1`}>
                    <span className={`text-sm font-black ${color.split(' ')[0]}`}>{label}</span>
                    <span className="text-[9px] text-zinc-600">{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center px-3 text-zinc-600">
            <ChevronRight size={18} className="rotate-90 sm:rotate-0" />
          </div>

          {/* Output */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center max-w-[180px]">
              <p className="text-xs font-medium" style={{ color: 'var(--panel-text)' }}>Focused Assistance</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--panel-text-muted)' }}>Prioritised, grounded, timely</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pillar cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PILLARS.map(({ key, label, icon, color, description, examples }) => (
          <div
            key={key}
            className={`rounded-2xl border ${color.border} ${color.bg} p-4 flex flex-col gap-3`}
          >
            <div className="flex items-center gap-2">
              {icon}
              <p className={`text-sm font-bold ${color.text}`}>{label}</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>{description}</p>
            <div className="space-y-1">
              {examples.map((ex, i) => (
                <p key={i} className="text-[10px] italic" style={{ color: 'var(--panel-text-muted)' }}>
                  {ex}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Toggle */}
      <div className="rounded-2xl border px-5 py-4"
        style={{ background: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>Enable 3P Focus Mode</p>
            <p className="text-xs mt-0.5 max-w-sm" style={{ color: 'var(--panel-text-muted)' }}>
              AI OS will passively monitor your conversations for Purpose, Plan, and Pressure
              signals to keep you aligned with your goals. You can change this anytime in Admin settings.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            aria-pressed={enabled}
            className="shrink-0 flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <AnimatePresence mode="wait" initial={false}>
              {enabled ? (
                <motion.span
                  key="on"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ToggleRight size={44} className="text-cyan-400" />
                </motion.span>
              ) : (
                <motion.span
                  key="off"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ToggleLeft size={44} className="text-zinc-600" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Status badge */}
        <div className={`mt-3 rounded-lg px-3 py-2 text-center text-xs font-semibold transition-colors ${
          enabled
            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-400/20'
            : 'border'
        }`}
        style={!enabled ? { background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--panel-text-muted)' } : undefined}>
          {enabled ? '3P Focus Mode is ON — AI OS will track Purpose, Plan, and Pressure' : '3P Focus Mode is OFF — you can enable it later in Admin settings'}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-center pt-2">
        <SovereignButton onClick={onNext} variant="primary" className="px-10 py-3">
          Continue to Planet AI OS <ChevronRight size={18} />
        </SovereignButton>
      </div>
    </div>
  );
}
