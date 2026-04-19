/**
 * AI OS welcome canvas.
 *
 * Shown before the first session starts. Keeps the center stage sparse:
 * ambient video, one primary power button, and lightweight secondary actions.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Power } from 'lucide-react';
import {
  activateReferralCode,
  trackReferralAttempt,
  verifyReferralCode,
} from '../../core/referralAccess';
import { podcastEpisodes } from '../../content/podcastEpisodes';
import type { SessionEntryClassification } from '../../shell/sessionEntryClassification';
import type { WorkspaceState } from '../../shell/workspaceState';

type Props = {
  workspaceState: WorkspaceState;
  sessionEntry: SessionEntryClassification;
  /** Kept for API compatibility. */
  onOpenMenu: () => void;
  onSelectMode: (mode: 'voice' | 'chat') => void;
  /** Called when the user clicks the Start button. */
  onStart?: () => void;
  onOpenIntro?: () => void;
  onOpenPodcasts?: () => void;
};

export function ShellVoiceIdlePanel({ onStart, onSelectMode, onOpenIntro, onOpenPodcasts }: Props) {
  const [referralCode, setReferralCode] = useState('');
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [referralAccepted, setReferralAccepted] = useState(false);
  const [showReferralField, setShowReferralField] = useState(false);
  const latestPodcast = podcastEpisodes[podcastEpisodes.length - 1] ?? null;

  const handleStart = () => {
    if (onStart) {
      onStart();
    } else {
      onSelectMode('voice');
    }
  };

  const handleEnter = () => {
    if (!referralCode.trim()) {
      setReferralMessage(null);
      handleStart();
      return;
    }

    const { accepted, normalized } = verifyReferralCode(referralCode);
    trackReferralAttempt(referralCode, accepted);

    if (!accepted) {
      setReferralAccepted(false);
      setReferralMessage('Referral code not recognized. Use a valid early-access code.');
      return;
    }

    activateReferralCode(normalized);
    setReferralAccepted(true);
    setReferralMessage(`Referral code ${normalized} accepted. Opening early access...`);
    handleStart();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute inset-0 overflow-hidden text-center"
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/welcome-circle-blue.mp4"
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
            AI Operating System
          </motion.p>

          <div className="space-y-3">
            <h1
              className="text-3xl font-black tracking-tight md:text-5xl"
              style={{ color: 'var(--panel-heading)', textShadow: '0 0 28px rgba(15,23,42,0.32)' }}
            >
              Welcome to AI OS
            </h1>
            <p
              className="mx-auto max-w-md text-sm leading-relaxed md:text-base"
              style={{ color: 'var(--panel-text-muted)' }}
            >
              Voice-first, background-led, and ready when you are.
            </p>
          </div>

          <motion.button
            type="button"
            onClick={handleEnter}
            className="flex h-28 w-28 items-center justify-center rounded-full text-white"
            style={{
              background: 'linear-gradient(135deg, rgba(15,118,110,0.9) 0%, rgba(8,145,178,0.92) 48%, rgba(37,99,235,0.92) 100%)',
              border: '1px solid rgba(125,211,252,0.28)',
              boxShadow: '0 0 36px rgba(34,211,238,0.24), 0 0 84px rgba(37,99,235,0.15)',
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Enter AI OS"
          >
            <Power size={34} />
          </motion.button>

          <p
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: 'var(--panel-heading)' }}
          >
            Press to enter
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <SecondaryAction
              label={showReferralField ? 'Hide referral code' : 'Use referral code'}
              onClick={() => {
                setShowReferralField((current) => !current);
                setReferralMessage(null);
              }}
            />
            <SecondaryAction label="Research intro" onClick={onOpenIntro} />
            <SecondaryAction
              label={latestPodcast ? `Podcast ${latestPodcast.durationLabel}` : 'Open podcast'}
              onClick={onOpenPodcasts}
            />
          </div>

          {showReferralField ? (
            <div
              className="w-full max-w-sm rounded-2xl p-3 backdrop-blur-md"
              style={{
                background: 'color-mix(in srgb, var(--panel-bg) 48%, transparent)',
                border: '1px solid var(--panel-border)',
              }}
            >
              <input
                value={referralCode}
                onChange={(event) => {
                  setReferralCode(event.target.value);
                  if (referralMessage) setReferralMessage(null);
                  if (referralAccepted) setReferralAccepted(false);
                }}
                placeholder="Enter referral code"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--panel-input-bg)',
                  border: '1px solid var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
              />
              {referralMessage ? (
                <p
                  className="mt-2 text-xs leading-relaxed"
                  style={{ color: referralAccepted ? 'var(--panel-accent-text)' : '#fca5a5' }}
                >
                  {referralMessage}
                </p>
              ) : null}
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
            Sovereign Kernel Ready
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SecondaryAction({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
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
