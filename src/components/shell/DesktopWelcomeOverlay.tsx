/**
 * First-time workspace greeting after the operator picks Voice or Chat on the Vibe idle panel.
 * Centered card + Continue; voice welcome is triggered from App via `speakText`.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { SovereignButton } from '../../ui-core/SovereignButton';

export const DESKTOP_WELCOME_TITLE = 'Welcome to the AI OS Desk Top.';

export const DESKTOP_WELCOME_BODY =
  'The desktop is your workspace for verified Vibe Coding University surfaces. Open the University window from the desktop when you are ready.';

/** Spoken by the shell voice bar when the overlay opens (may differ slightly from card copy for natural TTS). */
export const DESKTOP_WELCOME_VOICE_SCRIPT = `${DESKTOP_WELCOME_TITLE} ${DESKTOP_WELCOME_BODY} Tap Continue when you are ready to explore.`;

type Props = {
  open: boolean;
  onContinue: () => void;
};

export function DesktopWelcomeOverlay({ open, onContinue }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="desktop-welcome-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[var(--z-shell-desktop-welcome-backdrop)]"
            style={{ background: 'rgba(2, 6, 23, 0.55)', backdropFilter: 'blur(6px)' }}
            aria-hidden
          />
          <motion.div
            key="desktop-welcome-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="desktop-welcome-title"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed inset-0 z-[var(--z-shell-desktop-welcome)] flex items-center justify-center pointer-events-none px-4 pt-[calc(var(--shell-header-height)+1rem)] pb-[calc(var(--shell-footer-height)+1rem)]"
          >
            <div
              className="pointer-events-auto w-full max-w-lg rounded-2xl p-6 shadow-2xl md:p-8"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
              }}
            >
              <h2
                id="desktop-welcome-title"
                className="text-center text-lg font-bold leading-snug md:text-xl"
                style={{ color: 'var(--panel-heading)' }}
              >
                {DESKTOP_WELCOME_TITLE}
              </h2>
              <p
                className="mt-4 text-center text-sm leading-relaxed md:text-[15px]"
                style={{ color: 'var(--panel-text)' }}
              >
                {DESKTOP_WELCOME_BODY}
              </p>
              <div className="mt-8 flex justify-center">
                <SovereignButton type="button" variant="primary" onClick={onContinue} className="min-w-[10rem]">
                  Continue
                </SovereignButton>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
