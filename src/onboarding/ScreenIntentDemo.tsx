/**
 * ScreenIntentDemo — "Intent to Outcome Marketplace"
 *
 * Demonstrates the CANI Victory Lap Formula: one person's proven intent becomes
 * the community's repeatable wealth engine (AMD-2026-015).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ArrowRight,
  Mic,
  Send,
  Loader2,
  Zap,
  Target,
  TrendingUp,
  Repeat2,
  Users,
  DollarSign,
  CheckCircle2,
  Wrench,
  Play,
} from 'lucide-react';
import { SovereignButton, SovereignTitle } from '../ui-core';
import { postLocalModelChat } from '../api/localModelClient';

// ─── Intent routing table ────────────────────────────────────────────────────

interface IntentChain {
  intent: string;
  skill: string;
  action: string;
  outcome: string;
  color: string;
}

const INTENT_ROUTES: Array<{ keywords: string[]; chain: IntentChain }> = [
  {
    keywords: ['money', 'income', 'revenue', 'earn', 'make money', 'profit'],
    chain: {
      intent: 'Generate income with what I know',
      skill: 'monetize_knowledge',
      action: 'process_documentation',
      outcome: 'Repeatable revenue process documented and listed in marketplace',
      color: 'emerald',
    },
  },
  {
    keywords: ['process', 'repeat', 'automate', 'passive', 'system', 'formula'],
    chain: {
      intent: 'Turn my process into passive income',
      skill: 'process_capture',
      action: 'publish_and_list',
      outcome: 'Process licensed to the community — earn 75% of every sale',
      color: 'cyan',
    },
  },
  {
    keywords: ['1000', '$1000', 'thousand', 'week', 'fast', 'quick'],
    chain: {
      intent: 'Find a proven way to make $1,000 this week',
      skill: 'marketplace_search',
      action: 'deploy_licensed_process',
      outcome: 'Agent found John\'s proven process — deployment ready in minutes',
      color: 'amber',
    },
  },
  {
    keywords: ['publish', 'sell', 'publication', 'ebook', 'book', 'write'],
    chain: {
      intent: 'Write and sell a publication',
      skill: 'content_monetization',
      action: 'list_on_marketplace',
      outcome: '$20/sale — process documented, repeatable, listed for licensing',
      color: 'violet',
    },
  },
  {
    keywords: ['community', 'share', 'distribute', 'scale', 'replicate'],
    chain: {
      intent: 'Build a repeatable revenue system',
      skill: 'victory_lap_formula',
      action: 'community_distribution',
      outcome: '1,000 users deploy your process — you earn 20% on every outcome',
      color: 'sky',
    },
  },
];

function FALLBACK_CHAIN(intentText: string): IntentChain {
  return {
    intent: intentText,
    skill: 'intent_classifier',
    action: 'route_to_outcome',
    outcome: 'Intent mapped to repeatable outcome and queued for marketplace listing',
    color: 'zinc',
  };
}

function resolveChain(text: string): IntentChain {
  const lower = text.toLowerCase();
  for (const { keywords, chain } of INTENT_ROUTES) {
    if (keywords.some((k) => lower.includes(k))) {
      return { ...chain, intent: text };
    }
  }
  return FALLBACK_CHAIN(text);
}

// ─── Color maps ─────────────────────────────────────────────────────────────

type ChainColor = IntentChain['color'];

const colorMap: Record<ChainColor, { border: string; text: string; bg: string; glow: string }> = {
  emerald: { border: 'border-emerald-400/40', text: 'text-emerald-300', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_16px_rgba(52,211,153,0.35)]' },
  cyan:    { border: 'border-cyan-400/40',    text: 'text-cyan-300',    bg: 'bg-cyan-500/10',    glow: 'shadow-[0_0_16px_rgba(34,211,238,0.35)]' },
  amber:   { border: 'border-amber-400/40',   text: 'text-amber-300',   bg: 'bg-amber-500/10',   glow: 'shadow-[0_0_16px_rgba(251,191,36,0.35)]' },
  violet:  { border: 'border-violet-400/40',  text: 'text-violet-300',  bg: 'bg-violet-500/10',  glow: 'shadow-[0_0_16px_rgba(167,139,250,0.35)]' },
  sky:     { border: 'border-sky-400/40',     text: 'text-sky-300',     bg: 'bg-sky-500/10',     glow: 'shadow-[0_0_16px_rgba(56,189,248,0.35)]' },
  blue:    { border: 'border-blue-400/40',    text: 'text-blue-300',    bg: 'bg-blue-500/10',    glow: 'shadow-[0_0_16px_rgba(96,165,250,0.35)]' },
  zinc:    { border: 'border-zinc-400/40',    text: 'text-zinc-300',    bg: 'bg-zinc-500/10',    glow: '' },
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ScreenIntentDemoProps {
  commanderName: string;
  onNext: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

type AnimStep = 'idle' | 'intent' | 'skill' | 'action' | 'outcome' | 'done';

const CHAIN_NODES: AnimStep[] = ['intent', 'skill', 'action', 'outcome'];
const ANIM_DELAY = 480;

export function ScreenIntentDemo({ commanderName, onNext }: ScreenIntentDemoProps) {
  const [input, setInput] = useState('');
  const [animStep, setAnimStep] = useState<AnimStep>('idle');
  const [activeChain, setActiveChain] = useState<IntentChain | null>(null);
  const [narration, setNarration] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pttActive, setPttActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const runChain = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      setBusy(true);
      setNarration(null);
      const chain = resolveChain(text.trim());
      setActiveChain(chain);

      setAnimStep('idle');
      await new Promise((r) => setTimeout(r, 200));
      for (const step of CHAIN_NODES) {
        setAnimStep(step);
        await new Promise((r) => setTimeout(r, ANIM_DELAY));
      }
      setAnimStep('done');

      try {
        const { content } = await postLocalModelChat({
          model: 'llama3.2',
          messages: [
            {
              role: 'system',
              content:
                'You are the AI OS intent engine narrator. Respond in exactly one sentence (max 30 words). ' +
                'Describe how this intent becomes a repeatable, distributable income-generating process.',
            },
            {
              role: 'user',
              content: `Intent: "${chain.intent}" → Skill: "${chain.skill}" → Action: "${chain.action}" → Outcome: "${chain.outcome}"`,
            },
          ],
        });
        setNarration(content);
      } catch {
        // Local model not running — chain still displays
      }
      setBusy(false);
    },
    [busy],
  );

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    void runChain(input);
    setInput('');
  }, [input, runChain]);

  const startPtt = useCallback(() => {
    if (!speechSupported || pttActive) return;
    const SR =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    recognitionRef.current = rec;
    setPttActive(true);
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? '';
      void runChain(t);
    };
    rec.onerror = () => setPttActive(false);
    rec.onend = () => setPttActive(false);
    rec.start();
  }, [speechSupported, pttActive, runChain]);

  const stopPtt = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setPttActive(false);
  }, []);

  const examples = [
    'Help me make money with what I know',
    'Turn my process into passive income',
    'Find a proven way to make $1,000 this week',
    'Build a repeatable revenue system',
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-cyan-400 text-sm uppercase tracking-[0.3em] mb-1">Planet AI OS</p>
        <SovereignTitle level={2}>Intent to Outcome Marketplace</SovereignTitle>
        <p className="mt-2 text-sm max-w-xl mx-auto" style={{ color: 'var(--panel-text-muted)' }}>
          One person's proven process becomes the community's repeatable wealth engine.
          Try it, {commanderName || 'Commander'}.
        </p>
      </div>

      {/* Story cards — John → Michael → Community */}
      <MarketplaceStoryCards />

      {/* Chain diagram */}
      <IntentChainDiagram chain={activeChain} animStep={animStep} />

      {/* Narration */}
      <AnimatePresence>
        {narration && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border px-4 py-3 flex items-start gap-3"
            style={{
              background: 'var(--panel-surface)',
              borderColor: 'var(--panel-border)',
            }}
          >
            <Zap size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm italic leading-relaxed" style={{ color: 'var(--panel-text)' }}>"{narration}"</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => void runChain(ex)}
            disabled={busy}
            className="rounded-full border px-3 py-1.5 text-xs transition-all disabled:opacity-40"
            style={{
              background: 'var(--panel-surface)',
              borderColor: 'var(--panel-border)',
              color: 'var(--panel-text-muted)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--panel-text)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--panel-input-border)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--panel-text-muted)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--panel-border)';
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && handleSubmit()}
          placeholder="Tell me something you'd like to accomplish…"
          disabled={busy}
          className="min-w-0 flex-1 rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-50"
          style={{
            background: 'var(--panel-input-bg)',
            border: '1px solid var(--panel-input-border)',
            color: 'var(--panel-text)',
          }}
        />
        {speechSupported && (
          <button
            type="button"
            onPointerDown={startPtt}
            onPointerUp={stopPtt}
            onPointerLeave={stopPtt}
            disabled={busy}
            className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border transition-all disabled:opacity-40 ${
              pttActive
                ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)] animate-pulse'
                : ''
            }`}
            style={!pttActive ? { background: 'var(--panel-surface)', borderColor: 'var(--panel-border)', color: 'var(--panel-text-muted)' } : undefined}
            aria-label="Hold to speak"
          >
            <Mic size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !input.trim()}
          className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border transition-colors disabled:opacity-30"
          style={{
            background: 'var(--panel-surface)',
            borderColor: 'var(--panel-border)',
            color: 'var(--panel-text-muted)',
          }}
          aria-label="Run intent"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {/* Continue */}
      <div className="flex justify-center pt-2">
        <SovereignButton onClick={onNext} variant="primary" className="px-10 py-3">
          Continue to Your Success Formula <ChevronRight size={18} />
        </SovereignButton>
      </div>
    </div>
  );
}

// ─── Marketplace story cards ─────────────────────────────────────────────────

function MarketplaceStoryCards() {
  const steps = [
    {
      icon: <DollarSign size={18} className="text-emerald-300" />,
      name: 'John',
      label: 'Documents a Process',
      desc: 'John writes and sells a $20 publication on Facebook groups. His agent documents the process, marks it repeatable, and lists it in the marketplace.',
      metric: '$20/sale',
      color: 'emerald',
    },
    {
      icon: <TrendingUp size={18} className="text-amber-300" />,
      name: 'Michael',
      label: 'Finds the Process',
      desc: "Michael asks his agent to help make $1,000 this week. The agent finds John's proven process and recommends deployment. Michael earns $10,000 in 30 days.",
      metric: '$10k/month',
      color: 'amber',
    },
    {
      icon: <Users size={18} className="text-cyan-300" />,
      name: 'Community',
      label: 'Repeats the Victory',
      desc: '1,000 users repeat the process across different Facebook groups by licensing from John. John earns 75% of every $20 license (20% fee, 5% marketplace).',
      metric: '$100k in 30 days',
      color: 'cyan',
    },
    {
      icon: <Repeat2 size={18} className="text-violet-300" />,
      name: 'The Loop',
      label: 'CANI Victory Lap',
      desc: 'More proof compounds the value. New users join, wealth distributes through the community. Every proven intent becomes a community asset.',
      metric: 'Compounding',
      color: 'violet',
    },
  ];

  const borderColors: Record<string, string> = {
    emerald: 'rgba(52,211,153,0.25)',
    amber: 'rgba(251,191,36,0.25)',
    cyan: 'rgba(34,211,238,0.25)',
    violet: 'rgba(167,139,250,0.25)',
  };
  const bgColors: Record<string, string> = {
    emerald: 'rgba(52,211,153,0.05)',
    amber: 'rgba(251,191,36,0.05)',
    cyan: 'rgba(34,211,238,0.05)',
    violet: 'rgba(167,139,250,0.05)',
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {steps.map((s, i) => (
        <div key={s.name} className="relative rounded-2xl border p-3 flex flex-col gap-2"
          style={{ background: bgColors[s.color], borderColor: borderColors[s.color] }}>
          {/* Step number */}
          <span className="absolute top-2.5 right-3 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--panel-text-muted)' }}>
            0{i + 1}
          </span>
          <div className="flex items-center gap-1.5">
            {s.icon}
            <span className="text-xs font-bold" style={{ color: 'var(--panel-heading)' }}>{s.name}</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--panel-text-muted)' }}>
            {s.label}
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--panel-text)' }}>
            {s.desc}
          </p>
          <div className="mt-auto pt-1">
            <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: bgColors[s.color], borderColor: borderColors[s.color], border: `1px solid ${borderColors[s.color]}`, color: 'var(--panel-heading)' }}>
              {s.metric}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Chain diagram ───────────────────────────────────────────────────────────

const NODE_DEFS: {
  step: AnimStep;
  label: string;
  field: keyof IntentChain | null;
  icon: ReactNode;
}[] = [
  { step: 'intent',  label: 'Intent',  field: 'intent',  icon: <Target size={16} /> },
  { step: 'skill',   label: 'Skill',   field: 'skill',   icon: <Wrench size={16} /> },
  { step: 'action',  label: 'Action',  field: 'action',  icon: <Play   size={16} /> },
  { step: 'outcome', label: 'Outcome', field: 'outcome', icon: <CheckCircle2 size={16} /> },
];

const STEP_ORDER: AnimStep[] = ['idle', 'intent', 'skill', 'action', 'outcome', 'done'];
function stepIndex(s: AnimStep) { return STEP_ORDER.indexOf(s); }

function IntentChainDiagram({
  chain,
  animStep,
}: {
  chain: IntentChain | null;
  animStep: AnimStep;
}) {
  const colors = chain ? colorMap[chain.color] : null;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3">
      {NODE_DEFS.map(({ step, label, field, icon }, i) => {
        const reached = stepIndex(animStep) >= stepIndex(step);
        const active = animStep === step;
        const value = chain && field ? (chain[field] as string) : null;

        return (
          <div key={step} className="flex flex-col sm:flex-row items-center flex-1">
            <motion.div
              animate={{
                opacity: reached ? 1 : 0.3,
                scale: active ? 1.04 : 1,
              }}
              transition={{ duration: 0.3 }}
              className={`flex-1 w-full rounded-2xl border p-4 min-h-[100px] flex flex-col gap-2 transition-all ${
                reached && colors ? `${colors.border} ${colors.bg} ${active ? colors.glow : ''}` : ''
              }`}
              style={
                !reached || !colors
                  ? { background: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }
                  : undefined
              }
            >
              <div className={`flex items-center gap-2 ${reached && colors ? colors.text : ''}`}
                style={!reached || !colors ? { color: 'var(--panel-text-muted)' } : undefined}>
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
              </div>
              <AnimatePresence mode="wait">
                {value && reached ? (
                  <motion.p
                    key={value}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--panel-text)' }}
                  >
                    {value}
                  </motion.p>
                ) : (
                  <motion.p
                    key="placeholder"
                    className="text-xs italic"
                    style={{ color: 'var(--panel-text-muted)' }}
                  >
                    Waiting for input…
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {i < NODE_DEFS.length - 1 && (
              <motion.div
                animate={{ opacity: reached ? 0.8 : 0.2 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center px-1 shrink-0 py-2 sm:py-0"
              >
                <ArrowRight
                  size={18}
                  className={reached && colors ? colors.text : ''}
                  style={!reached || !colors ? { color: 'var(--panel-text-muted)' } : undefined}
                />
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}
