/**
 * Phone + OTP sign-in panel — uses the real checkmeClient (sendOtp / verifyOtp).
 * Mirrors the OTP flow in OnboardingFlow.tsx ScreenReturningPhone + ScreenReturningOtp.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { SovereignButton, SovereignDescription, SovereignTitle } from '../../ui-core';
import {
  sendOtp,
  verifyOtp,
  formatCheckmeUserError,
  CHECKME_SESSION_PHONE_KEY,
} from '../../core/io/checkmeClient';

type Step = 'phone' | 'otp';

type Props = {
  onClose: () => void;
  /** Called after OTP passes; phone is E.164-style normalized digits only for display. */
  onVerified: (phone: string) => void;
};

/** When VITE_OTP_SKIP_SEND=true the send step is skipped (local dev without a backend). */
const skipSend = import.meta.env.VITE_OTP_SKIP_SEND === 'true';

export function AuthPanel({ onClose, onVerified }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = phoneInput.trim();
    if (!v) return;

    if (skipSend) {
      sessionStorage.removeItem(CHECKME_SESSION_PHONE_KEY);
      setPhoneDigits(v);
      setStep('otp');
      setOtpInput('');
      return;
    }

    setSending(true);
    try {
      const result = await sendOtp(v);
      sessionStorage.setItem(CHECKME_SESSION_PHONE_KEY, result.phone);
      setPhoneDigits(result.phone);
      setStep('otp');
      setOtpInput('');
    } catch (err) {
      setError(formatCheckmeUserError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSending(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = otpInput.trim();
    if (code.length !== 6) {
      setError('Enter the 6-digit code sent to your phone.');
      return;
    }

    const phone = sessionStorage.getItem(CHECKME_SESSION_PHONE_KEY) ?? phoneDigits;

    if (!skipSend && phone) {
      setVerifying(true);
      try {
        const result = await verifyOtp(phone, code);
        if (!result.verified) throw new Error('Code could not be verified.');
        sessionStorage.removeItem(CHECKME_SESSION_PHONE_KEY);
      } catch (err) {
        setError(formatCheckmeUserError(err instanceof Error ? err.message : String(err)));
        setVerifying(false);
        return;
      }
      setVerifying(false);
    }

    onVerified(phone);
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-shell-modal-backdrop)] flex items-center justify-center p-4"
      style={{ background: 'rgba(2, 6, 23, 0.72)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-panel-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          background: 'var(--panel-bg)',
          borderColor: 'var(--panel-border)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 transition hover:opacity-80"
          style={{ color: 'var(--panel-text-muted)' }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <SovereignTitle level={2} className="pr-10 text-[var(--panel-heading)]">
          <span id="auth-panel-title">
            {step === 'phone' ? 'Sign in with phone' : 'Enter verification code'}
          </span>
        </SovereignTitle>
        <SovereignDescription className="mt-2 text-[var(--panel-text-muted)]">
          {step === 'phone'
            ? 'We will send a one-time code to verify your identity.'
            : `Code sent to …${phoneDigits.slice(-4)}. Check your messages.`}
        </SovereignDescription>

        {error ? (
          <p className="mt-3 text-sm" style={{ color: '#f87171' }}>
            {error}
          </p>
        ) : null}

        {step === 'phone' ? (
          <form onSubmit={(e) => void handlePhoneSubmit(e)} className="mt-6 flex flex-col gap-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--panel-text-muted)' }}>
                Phone number
              </span>
              <input
                type="tel"
                autoComplete="tel"
                value={phoneInput}
                onChange={(ev) => setPhoneInput(ev.target.value)}
                className="mt-1 w-full rounded-xl px-4 py-3 text-sm outline-none ring-emerald-500/40 focus:ring-2"
                style={{
                  background: 'var(--panel-input-bg)',
                  border: '1px solid var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
                placeholder="+1 415 555 0100"
              />
            </label>
            <SovereignButton type="submit" variant="primary" className="w-full" disabled={sending}>
              {sending ? 'Sending code…' : 'Send code'}
            </SovereignButton>
          </form>
        ) : (
          <form onSubmit={(e) => void handleOtpSubmit(e)} className="mt-6 flex flex-col gap-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--panel-text-muted)' }}>
                One-time code
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpInput}
                onChange={(ev) => setOtpInput(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 w-full rounded-xl px-4 py-3 text-sm tracking-[0.35em] outline-none ring-emerald-500/40 focus:ring-2"
                style={{
                  background: 'var(--panel-input-bg)',
                  border: '1px solid var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
                placeholder="000000"
              />
            </label>
            <div className="flex gap-3">
              <SovereignButton
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={verifying}
                onClick={() => {
                  setStep('phone');
                  setError(null);
                }}
              >
                Back
              </SovereignButton>
              <SovereignButton type="submit" variant="primary" className="flex-1" disabled={verifying}>
                {verifying ? 'Verifying…' : 'Verify'}
              </SovereignButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
