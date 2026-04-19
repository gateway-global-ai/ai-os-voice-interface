/**
 * ScreenInvite — "Issue Early Access"
 *
 * Viral growth loop: the Commander dispatches a single early-access invite
 * via SMS before being released into the OS. Powered by the Rust kernel's
 * `dispatch_invite` command (Twilio) — no copy-paste, no browser redirect.
 *
 * ARCH script:
 * [A+R] "Your intelligence stack is fully configured, {name}."
 * [C]   "AI OS is currently invite-only. Because you are on the Bare Metal standard,
 *        you have clearance to issue one early-access pass to your network."
 * [H]   "Enter their phone number, and I will dispatch the secure link."
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, SkipForward, CheckCircle2, AlertCircle, Lock, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { SovereignButton, SovereignTitle } from '../ui-core';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface ScreenInviteProps {
  commanderName: string;
  onNext: () => void;
  /** Called when "Dispatch Invite" is clicked so OnboardingFlow can record the intent. */
  onDispatch: (phone: string) => void;
}

// ─── Phone normalisation ────────────────────────────────────────────────────────

/** Strips non-digits, prepends +1 if no country code present. */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return digits;
}

function isValidPhone(raw: string): boolean {
  const normalised = normalisePhone(raw);
  return /^\+\d{10,15}$/.test(normalised);
}

// ─── Component ─────────────────────────────────────────────────────────────────

type DispatchState = 'idle' | 'sending' | 'sent' | 'error';

export function ScreenInvite({ commanderName, onNext, onDispatch }: ScreenInviteProps) {
  const [phone, setPhone] = useState('');
  const [dispatchState, setDispatchState] = useState<DispatchState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const name = commanderName || 'Commander';
  const canDispatch = isValidPhone(phone) && dispatchState === 'idle';

  const handleDispatch = useCallback(async () => {
    if (!canDispatch) return;
    setDispatchState('sending');
    setErrorMsg('');

    const toPhone = normalisePhone(phone);

    try {
      await invoke('dispatch_invite', {
        phone: toPhone,
        commanderName: name,
        twilioAccountSid: (process.env.TWILIO_ACCOUNT_SID ?? '').trim(),
        twilioAuthToken: (process.env.TWILIO_AUTH_TOKEN ?? '').trim(),
        twilioFrom: (process.env.TWILIO_PHONE_NUMBER ?? '').trim(),
      });
      setDispatchState('sent');
      onDispatch(toPhone);
      // Auto-advance after a short celebration window.
      window.setTimeout(onNext, 2000);
    } catch (err) {
      console.error('[ScreenInvite] dispatch_invite failed:', err);
      setErrorMsg(
        typeof err === 'string' ? err : 'SMS dispatch failed. You can skip and invite later.',
      );
      setDispatchState('error');
    }
  }, [canDispatch, phone, name, onDispatch, onNext]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8">
      {/* ── Header ── */}
      <div className="text-center">
        <p className="text-cyan-400 text-sm uppercase tracking-[0.3em] mb-1">Early Access</p>
        <SovereignTitle level={2}>Issue Early Access</SovereignTitle>
      </div>

      {/* ── ARCH Script card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.04] p-6 shadow-[0_0_32px_rgba(34,211,238,0.06)]"
      >
        {/* Status badge */}
        <div className="flex items-center gap-2 mb-4">
          <Lock size={14} className="text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
            Clearance Granted
          </span>
        </div>

        {/* ARCH text */}
        <p className="text-zinc-100 text-sm leading-relaxed mb-2">
          Your intelligence stack is fully configured,{' '}
          <span className="text-cyan-300 font-semibold">{name}</span>.
        </p>
        <p className="text-zinc-300 text-sm leading-relaxed mb-3">
          AI OS is currently invite-only. Because you are on the Bare Metal standard, you have
          clearance to issue{' '}
          <span className="text-white font-semibold">one early-access pass</span> to your network.
        </p>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Enter their phone number, and I will dispatch the secure link.
        </p>
      </motion.div>

      {/* ── Input + CTA ── */}
      <AnimatePresence mode="wait">
        {dispatchState === 'sent' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6"
          >
            <CheckCircle2 size={40} className="text-emerald-400" />
            <p className="text-emerald-300 font-semibold">Invite dispatched.</p>
            <p className="text-zinc-400 text-sm">Advancing to your command deck…</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            {/* Phone input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                Contact Phone Number
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (dispatchState === 'error') setDispatchState('idle');
                }}
                disabled={dispatchState === 'sending'}
                className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-white placeholder:text-zinc-600 text-sm tracking-wider backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/60 disabled:opacity-50 transition"
              />
              <p className="text-[11px] text-zinc-500 pl-1">
                US numbers: 10 digits. International: include country code (e.g.&nbsp;+44…)
              </p>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {dispatchState === 'error' && errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/[0.06] px-4 py-3 text-rose-300 text-sm"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <SovereignButton
                intent="primary"
                onClick={() => void handleDispatch()}
                disabled={!canDispatch}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {dispatchState === 'sending' ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Dispatching…
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    Dispatch Invite
                  </>
                )}
              </SovereignButton>

              <SovereignButton
                intent="ghost"
                onClick={onNext}
                disabled={dispatchState === 'sending'}
                className="flex items-center justify-center gap-2 sm:w-auto"
              >
                <SkipForward size={14} />
                Skip for Now
              </SovereignButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scarcity note ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-[11px] text-zinc-600 flex items-center justify-center gap-1.5"
      >
        <Send size={11} />
        The invite is dispatched directly by AI OS. Your contact receives no spam — just a single
        secured link to claim their terminal.
      </motion.p>
    </div>
  );
}
