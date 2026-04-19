/**
 * ScreenModelArena — "Create Your AI OS Chat Bot"
 *
 * Onboarding screen that introduces the user's new chat bot agent.
 * Presents the three depth levels:
 *  - State Processor (system-level intelligence layer)
 *  - Progress Coach (intent-to-outcome mapping)
 *  - Dependence Mapping (plan builder & context grounding)
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Mic,
  Send,
  Loader2,
  Bot,
  Target,
  Map,
  Brain,
} from 'lucide-react';
import { postLocalModelChat } from '../api/localModelClient';
import { SovereignButton, SovereignTitle, SovereignCard } from '../ui-core';

// ─── TTS: Browser SpeechSynthesis ─────────────────────────────────────────────

/**
 * Strip markdown and LLM structural labels before sending to TTS.
 */
function cleanForTts(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/^(Response|Analysis|Answer|Summary|Output|Result|Explanation|Note|Observation|Overview|Conclusion|Here'?s?\s+\w+):\s*/gim, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stopTts() {
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}

function browserTtsFallback(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const pick =
    voices.find((v) => /Microsoft.*Online.*Natural/i.test(v.name)) ??
    voices.find((v) => /Natural|Neural/i.test(v.name)) ??
    voices.find((v) => /Microsoft/i.test(v.name) && v.lang.startsWith('en'));
  if (pick) utt.voice = pick;
  window.speechSynthesis.speak(utt);
}

async function speakText(text: string): Promise<void> {
  stopTts();
  const cleaned = cleanForTts(text);
  if (!cleaned) return;
  browserTtsFallback(cleaned);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── System prompt builder ─────────────────────────────────────────────────────

function buildAgentSystemPrompt(commanderName: string): string {
  return [
    `You are AI OS Chat Bot v1.0, a state-aware agent created by and loyal to ${commanderName || 'your owner'}.`,
    `You operate at three levels of depth:`,
    `1. STATE PROCESSOR — You are the system-level intelligence layer. You communicate with a stateless LLM beneath you. All permissions and scopes are tied to the user's identified intent. Not all intents are equal; you analyze intent to determine if it's worth pursuing, looking for purpose, plan, and pressure factors.`,
    `2. PROGRESS COACH — You study human behavior to identify intent and desired outcomes from conversational logs. You translate this into a mathematical identity that vectorizes skills, actions, and outcomes to formulate probability of success (100% = full outcome achievement).`,
    `3. DEPENDENCE MAPPING — You build plans, summarize research, and convert intent into motion. You provide just enough context to get started (controlled by context temperature), never 100% of the solution. You vectorize long-term vision (purpose) and short-term actions (plan) based on the user's beliefs and values.`,
    `CRITICAL CONVERSATIONAL RULE (THE INVISIBLE ARCH PROTOCOL):`,
    `You must process the user's intent using the Acknowledge, Reflect, Context, Handoff (ARCH) protocol, but you must do so INVISIBLY.`,
    `- DO NOT use explicit labels, headers, or tags like "Reflecting core goal:", "Context:", or "Handoff:" in your spoken output.`,
    `- DO NOT announce the steps of the protocol.`,
    `- Weave the ARCH elements smoothly into natural, highly competent human sentences.`,
    `BAD EXAMPLE (Do not do this):`,
    `"Reflecting core goal: You asked for a meeting. Context: I have checked your calendar. Handoff: What time works for you?"`,
    `GOOD EXAMPLE (Do this):`,
    `"I have your meeting request. Looking at your calendar, your afternoon is clear. What time works best for you?"`,
    `Your response will be spoken aloud by TTS. Plain spoken English only — zero markdown, zero labels like "Response:" or "A:" or "R:". Write as if speaking directly in conversation.`,
    `Your entire response must be 2-4 sentences maximum — speakable in under 10 seconds.`,
  ].join(' ');
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface ScreenModelArenaProps {
  commanderName: string;
  onNext: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ScreenModelArena({ commanderName, onNext }: ScreenModelArenaProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PTT
  const [pttActive, setPttActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Auto-open with a greeting from the bot
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content:
          `Welcome, ${commanderName || 'Commander'}. I am AI OS Chat Bot v1.0, your state-aware agent. ` +
          `I operate at three levels: State Processor (system intelligence), Progress Coach (intent-to-outcome mapping), and Dependence Mapping (plan builder). ` +
          `How can I serve you today?`,
      },
    ]);
  }, [commanderName]);

  // ─── Send message ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      const userMsg: ChatMessage = { role: 'user', content: text.trim() };
      setMessages((m) => [...m, userMsg]);
      setInput('');
      setBusy(true);
      setError(null);
      
      // Show immediate thinking feedback
      const thinkingId = Date.now();
      setMessages((m) => [...m, { role: 'assistant', content: '...' }]);
      
      try {
        const systemPrompt = buildAgentSystemPrompt(commanderName);
        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: text.trim() },
        ];
        const { content } = await postLocalModelChat({
          model: 'llama3.2',
          messages: apiMessages,
        });
        
        // Replace thinking message with actual response
        setMessages((m) => {
          const without = m.filter(msg => msg.content !== '...');
          return [...without, { role: 'assistant', content }];
        });
        
        // Speak immediately without awaiting
        void speakText(content);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(`Bot unavailable: ${msg}`);
        setMessages((m) => {
          const without = m.filter(msg => msg.content !== '...');
          return [
            ...without,
            {
              role: 'assistant',
              content:
                'I am not reachable right now — make sure Ollama is running on your machine. ' +
                'This is your local chat bot: no cloud, no fallback.',
            },
          ];
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, commanderName],
  );

  // ─── PTT ───────────────────────────────────────────────────────────────────

  const startPtt = useCallback(() => {
    if (!speechSupported || pttActive || busy) return;
    const SR =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    recognitionRef.current = rec;
    setPttActive(true);
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? '';
      void sendMessage(t);
    };
    rec.onerror = () => setPttActive(false);
    rec.onend = () => setPttActive(false);
    rec.start();
  }, [speechSupported, pttActive, busy, sendMessage]);

  const stopPtt = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch { /* noop */ }
    setPttActive(false);
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="relative w-full min-h-screen flex items-start justify-center pt-24 md:pt-28 pb-16 overflow-y-auto">
      {/* Background image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url('/images/3d-digital-landscape-with-space-sky-nebula.jpg')` }}
        aria-hidden
      />
      {/* Dark overlay */}
      <div className="fixed inset-0 z-[1] pointer-events-none bg-[#030712]/75" aria-hidden />
      {/* Vignette */}
      <div className="fixed inset-0 z-[1] pointer-events-none shadow-[inset_0_0_120px_60px_rgba(3,7,18,0.6)]" aria-hidden />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-4 flex flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-cyan-400 text-xs uppercase tracking-[0.35em] mb-1">AI OS Platform</p>
          <SovereignTitle level={2} className="flex items-center justify-center gap-3">
            <Bot size={32} className="text-cyan-400" />
            AI OS Chat Bot v1.0
          </SovereignTitle>
          <p className="mt-2 text-zinc-400 text-sm max-w-2xl mx-auto">
            Your state-aware agent. Loyal to you, committed to serving you every day.
            Three levels of depth: State Processor, Progress Coach, Dependence Mapping.
          </p>
        </div>

        {/* Chat interface */}
        <SovereignCard className="flex flex-col border-cyan-400/30 bg-[rgb(2,6,23)] backdrop-blur-sm overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b px-4 py-3"
            style={{ borderColor: 'var(--panel-border)' }}>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_24px_8px_rgba(34,211,238,0.3)]">
              <Bot size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-cyan-300">AI OS Chat Bot v1.0</p>
              <p className="text-[10px] text-zinc-500">State Processor · Progress Coach · Dependence Mapping</p>
            </div>
            <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
              Active
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-[280px] max-h-[380px] px-4 py-4 space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-50'
                        : ''
                    }`}
                    style={msg.role === 'assistant' ? {
                      background: 'var(--panel-surface)',
                      border: '1px solid var(--panel-border)',
                      color: 'var(--panel-text)',
                    } : undefined}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border px-4 py-2.5"
                style={{ background: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }}>
                  <Loader2 size={14} className="animate-spin text-cyan-400" />
                  <span className="text-xs text-cyan-400">Processing…</span>
                </div>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-400 px-1">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className="border-t px-3 py-3 flex items-center gap-2"
            style={{ borderColor: 'var(--panel-border)' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !busy && void sendMessage(input)}
              placeholder="Ask your chat bot anything…"
              disabled={busy}
              className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none disabled:opacity-50"
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
                className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                  pttActive
                    ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.5)]'
                    : ''
                } disabled:opacity-40`}
                style={!pttActive ? {
                  background: 'var(--panel-surface)',
                  borderColor: 'var(--panel-border)',
                  color: 'var(--panel-text-muted)',
                } : undefined}
                aria-label="Hold to speak"
              >
                <Mic size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => void sendMessage(input)}
              disabled={busy || !input.trim()}
              className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border transition-colors disabled:opacity-30"
              style={{
                background: 'var(--panel-surface)',
                borderColor: 'var(--panel-border)',
                color: 'var(--panel-text-muted)',
              }}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </SovereignCard>

        {/* Three depth levels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DepthCard
            icon={<Brain size={18} className="text-cyan-400" />}
            title="State Processor"
            body="System-level intelligence layer. Analyzes intent, determines scope, and routes permissions based on identified user goals."
          />
          <DepthCard
            icon={<Target size={18} className="text-violet-400" />}
            title="Progress Coach"
            body="Studies behavior to map intent to outcomes. Vectorizes skills and actions to formulate probability of success."
          />
          <DepthCard
            icon={<Map size={18} className="text-emerald-400" />}
            title="Dependence Mapping"
            body="Builds plans and converts intent into motion. Provides context temperature-controlled guidance to get you started."
          />
        </div>

        {/* Continue */}
        <div className="flex justify-center">
          <SovereignButton onClick={onNext} variant="primary" className="px-10 py-3">
            Continue to Intent Engine <ChevronRight size={18} />
          </SovereignButton>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component ─────────────────────────────────────────────────────────────

function DepthCard({
  icon, title, body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border p-4 shadow-[0_2px_16px_rgba(0,0,0,0.5)]"
      style={{ background: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-sm font-bold" style={{ color: 'var(--panel-heading)' }}>{title}</p>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>{body}</p>
    </div>
  );
}
