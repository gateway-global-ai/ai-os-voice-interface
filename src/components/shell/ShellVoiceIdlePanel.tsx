/**
 * AI OS welcome canvas — Vibe Coding University landing.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { Fragment } from 'react';
import { motion } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import type { SessionEntryClassification } from '../../shell/sessionEntryClassification';
import type { WorkspaceState } from '../../shell/workspaceState';

export type VibeTopicId = 'university' | 'community' | 'coding_platform';

type Props = {
  workspaceState: WorkspaceState;
  sessionEntry: SessionEntryClassification;
  /** Kept for API compatibility (e.g. voice/chat preference before session). */
  onSelectMode: (mode: 'voice' | 'chat') => void;
  /** Recorded welcome — play / pause. */
  introAudioPlaying: boolean;
  onIntroPlayPause: () => void;
  /** Skip welcome and continue (e.g. join / loyalty / shell). */
  onSkipIntro: () => void;
  onOpenMenu: () => void;
  /** Sends a short scripted narration for the tapped Vibe topic. */
  onExplainVibeTopic?: (topic: VibeTopicId) => void;
  /** Small label above the headline (defaults to neutral OS line). */
  eyebrow?: string;
  /** Status line above bottom chrome (replaces kernel-ready copy when set). */
  footline?: string;
};

const VIBE_TOPIC_BUBBLES: { id: VibeTopicId; label: string }[] = [
  { id: 'university', label: 'University' },
  { id: 'community', label: 'Community' },
  { id: 'coding_platform', label: 'Coding Platform' },
];

export function ShellVoiceIdlePanel({
  onSelectMode: _onSelectMode,
  introAudioPlaying,
  onIntroPlayPause,
  onSkipIntro,
  onExplainVibeTopic,
  eyebrow = 'AI Operating System',
  footline = 'Sovereign Kernel Ready',
}: Props) {
  void _onSelectMode;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute inset-0 overflow-hidden text-center"
    >
      <video
        className="pointer-events-none absolute inset-0 h-full min-h-full w-full min-w-full object-cover"
        src="/videos/vibe_coder_video_bg.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(15,23,42,0.2) 0%, rgba(2,6,23,0.62) 58%, rgba(2,6,23,0.88) 100%)',
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 py-10 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          className="mx-auto flex w-full max-w-xl flex-col items-center gap-5"
        >
          <motion.p
            initial={{ opacity: 0, letterSpacing: '0.1em' }}
            animate={{ opacity: 1, letterSpacing: '0.32em' }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-[9px] font-black uppercase tracking-[0.32em]"
            style={{ color: 'var(--panel-text-muted)' }}
          >
            {eyebrow}
          </motion.p>

          <h1
            className="text-3xl font-black tracking-tight md:text-5xl"
            style={{ color: 'var(--panel-heading)', textShadow: '0 0 28px rgba(15,23,42,0.32)' }}
          >
            The Vibe Coding University.
          </h1>

          <motion.button
            type="button"
            onClick={() => void onIntroPlayPause()}
            className="flex h-28 w-28 items-center justify-center rounded-full text-white"
            style={{
              background: 'linear-gradient(135deg, rgba(15,118,110,0.9) 0%, rgba(8,145,178,0.92) 48%, rgba(37,99,235,0.92) 100%)',
              border: '1px solid rgba(125,211,252,0.28)',
              boxShadow: '0 0 36px rgba(34,211,238,0.24), 0 0 84px rgba(37,99,235,0.15)',
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label={introAudioPlaying ? 'Pause intro recording' : 'Play intro recording'}
          >
            {introAudioPlaying ? <Pause size={36} strokeWidth={2.2} /> : <Play size={36} strokeWidth={2.2} className="ml-1" />}
          </motion.button>

          <button
            type="button"
            onClick={onSkipIntro}
            className="text-[11px] font-bold uppercase tracking-[0.28em] underline-offset-4 transition hover:opacity-90"
            style={{ color: 'var(--panel-heading)' }}
          >
            Click to skip intro
          </button>

          {onExplainVibeTopic ? (
            <div
              className="flex flex-wrap items-center justify-center gap-3"
              role="group"
              aria-label="Vibe topics"
            >
              {VIBE_TOPIC_BUBBLES.map((item) => (
                <Fragment key={item.id}>
                  <TopicBubble
                    label={item.label}
                    onClick={() => onExplainVibeTopic(item.id)}
                  />
                </Fragment>
              ))}
            </div>
          ) : null}

          <div
            className="flex items-center gap-1.5 pt-1 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--panel-text-muted)' }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--panel-accent-text)' }}
            />
            {footline}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TopicBubble({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="rounded-full px-4 py-2 text-[14px] font-semibold uppercase tracking-[0.18em]"
      style={{
        background: 'color-mix(in srgb, var(--panel-surface) 72%, transparent)',
        border: '1px solid var(--panel-border)',
        color: 'var(--panel-text-muted)',
      }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      {label}
    </motion.button>
  );
}
