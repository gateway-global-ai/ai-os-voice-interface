/**
 * AI OS welcome canvas — Vibe Coding University landing.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import type { SessionEntryClassification } from '../../shell/sessionEntryClassification';
import type { WorkspaceState } from '../../shell/workspaceState';

export type VibeTopicId = 'university' | 'community' | 'coding_platform';
export type VcuAudiencePath = 'students' | 'professors' | 'guest_speakers';

type Props = {
  workspaceState: WorkspaceState;
  sessionEntry: SessionEntryClassification;
  /** Kept for API compatibility (e.g. voice/chat preference before session). */
  onSelectMode: (mode: 'voice' | 'chat') => void;
  /** Recorded welcome — play / pause. */
  introAudioPlaying: boolean;
  onIntroPlayPause: () => void;
  /** Skip welcome and continue (e.g. join / loyalty / shell). Used as fallback inside funnel actions. */
  onSkipIntro: () => void;
  /**
   * Hero link “Click to skip intro”. When `openCommunityMenuOnHeroSkip` is true, the 3-path
   * “Joining the Community” overlay opens after this runs.
   */
  onSkipIntroFromHero?: () => void;
  /** Guests: open in-panel sales funnel after hero skip. Auth: leave false (loyalty / session flow). */
  openCommunityMenuOnHeroSkip?: boolean;
  onOpenMenu: () => void;
  onCreateAccount?: () => void;
  onLogin?: () => void;
  onRequestAudiencePath?: (path: VcuAudiencePath) => void;
  /** Sends a short scripted narration for the tapped Vibe topic. */
  onExplainVibeTopic?: (topic: VibeTopicId) => void;
  /** Small label above the headline (defaults to neutral OS line). */
  eyebrow?: string;
  /** Status line above bottom chrome (replaces kernel-ready copy when set). */
  footline?: string;
};

const VCU_AUDIENCE_PATHS: Record<VcuAudiencePath, {
  label: string;
  actionLabel: string;
  description: string;
}> = {
  students: {
    label: 'Students',
    actionLabel: 'Request To Join The University',
    description:
      'If you are getting serious about AI and building your future around it, join our community and complete the application to receive program dates, curriculum updates, and featured guest speaker announcements.',
  },
  professors: {
    label: 'Professors',
    actionLabel: 'Request To Be A Professor',
    description:
      'We are looking for entrepreneurs and developers who have created meaningful success and can educate, inspire, and guide the next generation of builders. Compensation is paid to professors, and we are seeking the highest level of educators in today’s market.',
  },
  guest_speakers: {
    label: 'Guest Speakers',
    actionLabel: 'Request To Be A Guest Speaker',
    description:
      'If you have a story the world of vibe coding should hear, join the community and request to appear on our podcast or in an upcoming video conversation about platform economics, developer assistance, and the real work of AI.',
  },
};

const VCU_INTRO_PARAGRAPH =
  'People Over Profits. Join the community for free, network, and access free courses.';

export function ShellVoiceIdlePanel({
  onSelectMode: _onSelectMode,
  introAudioPlaying,
  onIntroPlayPause,
  onSkipIntro,
  onSkipIntroFromHero,
  openCommunityMenuOnHeroSkip = false,
  onCreateAccount,
  onLogin,
  onRequestAudiencePath,
  onExplainVibeTopic,
  eyebrow = 'AI Operating System',
  footline,
}: Props) {
  void _onSelectMode;
  void onExplainVibeTopic;
  const [activeAudiencePath, setActiveAudiencePath] = useState<VcuAudiencePath | null>(null);
  const [joinCommunityOpen, setJoinCommunityOpen] = useState(false);
  const activeAudience = activeAudiencePath ? VCU_AUDIENCE_PATHS[activeAudiencePath] : null;

  useEffect(() => {
    if (introAudioPlaying) {
      setJoinCommunityOpen(true);
    }
  }, [introAudioPlaying]);

  const handleIntroTransportClick = () => {
    if (!introAudioPlaying) {
      setJoinCommunityOpen(true);
    }
    void onIntroPlayPause();
  };

  const closeJoinCommunityOverlay = () => {
    setJoinCommunityOpen(false);
    setActiveAudiencePath(null);
  };

  const handleHeroSkipIntro = () => {
    (onSkipIntroFromHero ?? onSkipIntro)();
    if (openCommunityMenuOnHeroSkip) {
      setJoinCommunityOpen(true);
    }
  };

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
          background: 'var(--vcu-hero-video-scrim)',
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-start overflow-y-auto overscroll-contain px-6 pb-[calc(var(--shell-footer-height)+1rem)] pt-[calc(var(--shell-header-height)+1rem)] [-webkit-overflow-scrolling:touch] md:justify-center md:px-10 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5"
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
            className="text-3xl font-black uppercase tracking-tight md:text-5xl"
            style={{ color: 'var(--panel-heading)', textShadow: 'var(--vcu-hero-heading-shadow)' }}
          >
            Welcome To Vibe Coding University
          </h1>

          <p
            className="max-w-3xl text-sm leading-6 md:text-base"
            style={{ color: 'var(--panel-text-muted)' }}
          >
            {VCU_INTRO_PARAGRAPH}
          </p>

          <motion.button
            type="button"
            onClick={handleIntroTransportClick}
            className="flex h-28 w-28 items-center justify-center rounded-full text-white"
            style={{
              background: 'var(--vcu-hero-play-gradient)',
              border: '1px solid var(--vcu-hero-play-border)',
              boxShadow: 'var(--vcu-hero-play-shadow)',
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label={introAudioPlaying ? 'Pause intro recording' : 'Play intro recording'}
          >
            {introAudioPlaying ? <Pause size={36} strokeWidth={2.2} /> : <Play size={36} strokeWidth={2.2} className="ml-1" />}
          </motion.button>

          <button
            type="button"
            onClick={handleHeroSkipIntro}
            className="text-[11px] font-bold uppercase tracking-[0.28em] underline-offset-4 transition hover:opacity-90"
            style={{ color: 'var(--panel-heading)' }}
          >
            Click to skip intro
          </button>

          {joinCommunityOpen ? (
            <JoinCommunityOverlay
              introAudioPlaying={introAudioPlaying}
              onIntroPlayPause={() => void onIntroPlayPause()}
              onClose={closeJoinCommunityOverlay}
              onSelectPath={(path) => setActiveAudiencePath(path)}
            />
          ) : null}

          <AudiencePathOverlay
            activePath={activeAudiencePath}
            audience={activeAudience}
            onClose={() => setActiveAudiencePath(null)}
            onCreateAccount={onCreateAccount ?? onSkipIntro}
            onLogin={onLogin ?? onSkipIntro}
            onRequest={() => {
              if (!activeAudiencePath) {
                onSkipIntro();
                return;
              }
              if (onRequestAudiencePath) {
                onRequestAudiencePath(activeAudiencePath);
                return;
              }
              onSkipIntro();
            }}
          />

          {footline ? (
            <div
              className="flex items-center gap-1.5 pt-1 text-[9px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--panel-text-muted)' }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{
                  background: 'var(--panel-accent-text)',
                }}
              />
              {footline}
            </div>
          ) : null}
        </motion.div>
      </div>
    </motion.div>
  );
}

function JoinCommunityOverlay({
  introAudioPlaying,
  onIntroPlayPause,
  onClose,
  onSelectPath,
}: {
  introAudioPlaying: boolean;
  onIntroPlayPause: () => void;
  onClose: () => void;
  onSelectPath: (path: VcuAudiencePath) => void;
}) {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex min-h-full w-full items-center justify-center px-6 py-10"
      style={{
        background: 'var(--vcu-community-backdrop)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vcu-join-community-title"
    >
      <motion.section
        className="flex w-full max-w-3xl flex-col gap-5 rounded-3xl border p-6 text-left shadow-2xl md:p-8"
        style={{
          background: 'var(--vcu-community-card-bg)',
          borderColor: 'var(--vcu-community-card-border)',
          boxShadow: '0 24px 80px rgba(2, 6, 23, 0.35)',
        }}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="vcu-join-community-title"
            className="text-xl font-black uppercase tracking-tight md:text-2xl"
            style={{ color: 'var(--vcu-community-heading)' }}
          >
            Joining the Community
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onIntroPlayPause}
              className="flex h-10 w-10 items-center justify-center rounded-full border transition"
              style={{
                background: 'var(--vcu-community-tile-bg)',
                borderColor: 'var(--vcu-community-tile-border)',
                color: 'var(--vcu-community-heading)',
              }}
              aria-label={introAudioPlaying ? 'Pause intro audio' : 'Play intro audio'}
            >
              {introAudioPlaying ? <Pause size={18} strokeWidth={2.2} /> : <Play size={18} strokeWidth={2.2} className="ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]"
              style={{
                background: 'var(--vcu-community-tile-bg)',
                borderColor: 'var(--vcu-community-card-border)',
                color: 'var(--vcu-community-text-muted)',
              }}
            >
              Close
            </button>
          </div>
        </div>

        <nav className="grid gap-3 sm:grid-cols-3" aria-label="Community audience paths">
          {(Object.keys(VCU_AUDIENCE_PATHS) as VcuAudiencePath[]).map((path) => (
            <motion.button
              key={path}
              type="button"
              onClick={() => onSelectPath(path)}
              className="vcu-community-tile rounded-xl px-4 py-4 text-center text-sm font-black uppercase tracking-[0.16em]"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              {VCU_AUDIENCE_PATHS[path].label}
            </motion.button>
          ))}
        </nav>
      </motion.section>
    </motion.div>
  );
}

function AudiencePathOverlay({
  activePath,
  audience,
  onClose,
  onCreateAccount,
  onLogin,
  onRequest,
}: {
  activePath: VcuAudiencePath | null;
  audience: (typeof VCU_AUDIENCE_PATHS)[VcuAudiencePath] | null;
  onClose: () => void;
  onCreateAccount: () => void;
  onLogin: () => void;
  onRequest: () => void;
}) {
  if (!activePath || !audience) return null;

  return (
    <motion.div
      className="absolute inset-0 z-30 flex min-h-full w-full items-center justify-center px-6 py-10"
      style={{
        background: 'var(--vcu-community-backdrop)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${audience.label} onboarding options`}
    >
      <motion.section
        className="flex w-full max-w-4xl flex-col gap-6 rounded-3xl border p-6 text-left shadow-2xl md:p-8"
        style={{
          background: 'var(--vcu-community-detail-card-bg)',
          borderColor: 'var(--vcu-community-card-border)',
          boxShadow: '0 24px 80px rgba(2, 6, 23, 0.35)',
        }}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black md:text-5xl" style={{ color: 'var(--vcu-community-heading)' }}>
              {audience.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]"
            style={{
              background: 'var(--vcu-community-tile-bg)',
              borderColor: 'var(--vcu-community-card-border)',
              color: 'var(--vcu-community-text-muted)',
            }}
          >
            Back
          </button>
        </div>

        <p className="max-w-3xl text-base leading-7 md:text-lg" style={{ color: 'var(--vcu-community-text)' }}>
          {audience.description}
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          <FunnelActionButton label="Create Account" onClick={onCreateAccount} />
          <FunnelActionButton label="Login" onClick={onLogin} />
          <FunnelActionButton label={audience.actionLabel} onClick={onRequest} accent />
        </div>
      </motion.section>
    </motion.div>
  );
}

function FunnelActionButton({ label, onClick, accent = false }: { label: string; onClick: () => void; accent?: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.14em]"
      style={{
        background: accent ? 'var(--vcu-community-accent-bg)' : 'var(--vcu-community-tile-bg)',
        borderColor: accent ? 'var(--vcu-community-accent-border)' : 'var(--vcu-community-tile-border)',
        color: accent ? 'var(--vcu-community-accent-text)' : 'var(--vcu-community-heading)',
      }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      {label}
    </motion.button>
  );
}
