/**
 * LoyaltyIntroSequence — first-time user onboarding story.
 *
 * Three-card cinematic intro that plays once. Each card is narrated
 * by the AI voice engine and advances on user click.
 *
 * Edward Bernays principle: lead with truth, create identification,
 * then offer the alternative. The sequence does not sell — it reveals.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { Fragment, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type LoyaltyIntroSequenceProps = {
  /** Called once the user has completed all three cards. */
  onComplete: () => void;
  /** Pass the shell speakText so each card is narrated. */
  speakText?: (text: string, cueLabel?: string) => void;
  /** Interrupt active shell narration when the user skips ahead. */
  stopSpeech?: () => void;
};

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  body: ReactNode;
  cta: string;
  narration: string;
}

const SLIDES: Slide[] = [
  {
    id: 'data',
    eyebrow: 'Data brief',
    title: 'The Data Is Clear',
    body: (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatLine
            stat="140K-170K"
            label="people per day reported suicidal thoughts or intent in late 2025."
          />
          <StatLine
            stat="13M-14M"
            label="people reported serious suicidal thoughts in 2024."
          />
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--panel-text)' }}>
          The crisis is measurable, and the current platform model is making people more dependent instead of more capable.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
          AI OS starts by naming the problem clearly and treating the data as the center of the story.
        </p>
      </div>
    ),
    cta: 'Continue',
    narration:
      'The data is clear. One hundred and forty to one hundred and seventy thousand people per day reported suicidal thoughts or intent, and thirteen to fourteen million people reported serious suicidal thoughts in 2024. AI OS starts by naming that crisis clearly and refusing to bury the data.',
  },
  {
    id: 'loyalty',
    eyebrow: 'Loyalty disclosure',
    title: 'Loyalty Must Be Obvious',
    body: (
      <div className="space-y-4">
        <CalloutCard
          label="Before account creation"
          text="The agent is loyal to the platform first, and it should disclose that state clearly instead of hiding it."
        />
        <CalloutCard
          label="After account creation"
          text="The moment you create an account or sign in, loyalty transfers to you and the experience changes immediately."
        />
      </div>
    ),
    cta: 'Continue',
    narration:
      'Loyalty must be obvious. Before account creation, the agent is loyal to the platform and should say so plainly. The moment you create an account, loyalty transfers to you and the experience changes immediately.',
  },
  {
    id: 'solution',
    eyebrow: 'Operating model',
    title: 'Problem, Crisis, Solution',
    body: (
      <div className="space-y-4">
        {[
          {
            heading: 'Problem',
            text: 'Start by identifying what is actually broken instead of drowning the user in customization.',
          },
          {
            heading: 'Crisis',
            text: 'Focus on the pressure, risk, and human cost so the system responds with urgency and clarity.',
          },
          {
            heading: 'Solution',
            text: 'Present the path forward directly, then map intent to action and outcome with transparent state.',
          },
        ].map(({ heading, text }) => (
          <Fragment key={heading}>
            <CalloutCard label={heading} text={text} />
          </Fragment>
        ))}
      </div>
    ),
    cta: 'Enter AI OS',
    narration:
      'AI OS runs on a simple model. Identify the problem. Focus on the crisis. Present the solution. That is how loyalty becomes useful instead of decorative.',
  },
];

function StatLine({ stat, label }: { stat: string; label: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--panel-surface)',
        border: '1px solid var(--panel-border)',
      }}
    >
      <span
        className="block text-2xl font-black tabular-nums shrink-0"
        style={{ color: 'rgb(147,197,253)', textShadow: '0 0 16px rgba(59,130,246,0.5)' }}
      >
        {stat}
      </span>
      <span className="mt-2 block text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

function CalloutCard({ label, text }: { label: string; text: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--panel-surface)',
        border: '1px solid var(--panel-border)',
      }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgb(147,197,253)' }}>
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--panel-text)' }}>
        {text}
      </p>
    </div>
  );
}

const INTRO_SEEN_KEY = 'ai_os_initiated';

export function hasSeenLoyaltyIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markLoyaltyIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch { /* ignore */ }
}

export function LoyaltyIntroSequence({ onComplete, speakText, stopSpeech }: LoyaltyIntroSequenceProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const hasNarratedRef = useRef<Set<string>>(new Set());
  const narrationTimeoutRef = useRef<number | null>(null);
  const slide = SLIDES[slideIndex];

  const clearPendingNarration = useCallback(() => {
    if (narrationTimeoutRef.current !== null) {
      window.clearTimeout(narrationTimeoutRef.current);
      narrationTimeoutRef.current = null;
    }
  }, []);

  const stopNarration = useCallback(() => {
    clearPendingNarration();
    stopSpeech?.();
  }, [clearPendingNarration, stopSpeech]);

  // Narrate each slide once when it becomes active
  useEffect(() => {
    if (!speakText) return;
    if (hasNarratedRef.current.has(slide.id)) return;
    hasNarratedRef.current.add(slide.id);
    clearPendingNarration();
    // Give the card a brief moment to settle before narration starts.
    narrationTimeoutRef.current = window.setTimeout(() => {
      narrationTimeoutRef.current = null;
      speakText(slide.narration, slide.title);
    }, 150);
    return clearPendingNarration;
  }, [clearPendingNarration, slide, speakText]);

  useEffect(() => () => {
    stopNarration();
  }, [stopNarration]);

  const handleNext = () => {
    stopNarration();
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex((i) => i + 1);
    } else {
      markLoyaltyIntroSeen();
      onComplete();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[var(--z-shell-modal-backdrop)] bg-black/75 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Card container */}
      <div className="fixed inset-0 z-[var(--z-shell-system-controls)] flex items-center justify-center px-4 pointer-events-none">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={slide.id}
            className="pointer-events-auto w-full max-w-[min(95vw,52rem)] rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
            }}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {/* Blue accent bar */}
            <div
              className="h-0.5 w-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.8), transparent)',
              }}
            />

            <div className="px-7 pt-7 pb-6 space-y-6 md:px-9 md:pb-8">
              {/* Eyebrow + progress */}
              <div className="flex items-center justify-between">
                <p
                  className="text-[9px] uppercase tracking-[0.3em] font-black"
                  style={{ color: 'rgb(96,165,250)' }}
                >
                  {slide.eyebrow}
                </p>
                <div className="flex gap-1">
                  {SLIDES.map((s, i) => (
                    <span
                      key={s.id}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        width: i === slideIndex ? '1.5rem' : '0.4rem',
                        background:
                          i <= slideIndex
                            ? 'rgb(59,130,246)'
                            : 'var(--panel-border)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Title */}
              <h2
                className="text-2xl font-black leading-tight tracking-tight md:text-[2rem]"
                style={{ color: 'var(--panel-heading)' }}
              >
                {slide.title}
              </h2>

              {/* Body */}
              <div>{slide.body}</div>

              {/* CTA */}
              <motion.button
                type="button"
                onClick={handleNext}
                className="w-full rounded-xl py-3 text-sm font-black text-white"
                style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
                  border: '1px solid rgba(147,197,253,0.3)',
                  boxShadow: '0 0 20px rgba(59,130,246,0.25)',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {slide.cta} →
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
