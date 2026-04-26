/**
 * OnboardingGate — Intent-first entry point.
 *
 * Zone A fulfills MARKET_POSITIONING.
 * Zone B fulfills the remaining 4 system intents via three distinct user paths.
 *
 * Path 1 "Explore AI OS"     → DEMONSTRATE_CAPABILITIES + FAST_TIME_TO_VALUE  (no auth)
 * Path 2 "Join the Community" → SALES_FUNNEL + FRICTIONLESS_ONBOARDING         (OTP → new account)
 * Path 3 "Log In"             → UserIntent.ACCESS_SYSTEM_DESKTOP                (OTP → existing session)
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { Sparkles, LogIn, Rocket } from 'lucide-react';
import { SovereignButton } from '../../ui-core';
import { UserIntent, SystemIntent } from '../../shell/intentManager';

type Props = {
  /** Path 1 — DEMONSTRATE_CAPABILITIES. Triggers voice/AI intro without requiring auth. */
  onVibeCheck: () => void;
  /** Path 2 — SALES_FUNNEL + FRICTIONLESS_ONBOARDING. Opens AuthPanel for new account creation. */
  onJoinCommunity: () => void;
  /** Path 3 — ACCESS_SYSTEM_DESKTOP. Opens AuthPanel to restore an existing session. */
  onReturningUser: () => void;
};

export function OnboardingGate({ onVibeCheck, onJoinCommunity, onReturningUser }: Props) {
  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center">
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6"
        style={{
          paddingTop: 'calc(var(--shell-header-height) + 3rem)',
          paddingBottom: 'calc(var(--shell-footer-height) + 2rem)',
        }}
      >
        {/* ── Zone A: MARKET_POSITIONING ── */}
        <div className="text-center">
          <h1
            className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
            style={{ color: 'var(--panel-heading)' }}
          >
            Vibe Coders aren&apos;t broken.
            <br />
            The vibe coding systems are.
          </h1>
          <p
            className="mx-auto mt-4 max-w-lg text-base leading-relaxed"
            style={{ color: 'var(--panel-text-muted)' }}
          >
            Welcome to AI OS. A community where you can access our university to learn, network, and code.
          </p>
        </div>

        {/* ── Zone B: Three Intent Paths ── */}
        <div className="flex flex-row justify-center gap-6">
          {/* Path 1 — DEMONSTRATE_CAPABILITIES + FAST_TIME_TO_VALUE */}
          <IntentCard
            icon={<Rocket size={22} />}
            iconStyle="muted"
            badge="No sign-up required"
            title="Explore AI OS"
            description="Experience the AI interface and see what's possible before committing to anything."
            ctaLabel="Start exploring"
            ctaVariant="secondary"
            userIntent={UserIntent.VIBE_CHECK}
            systemIntents={[SystemIntent.DEMONSTRATE_CAPABILITIES, SystemIntent.FAST_TIME_TO_VALUE]}
            onSelect={onVibeCheck}
          />

          {/* Path 2 — SALES_FUNNEL + FRICTIONLESS_ONBOARDING */}
          <IntentCard
            icon={<Sparkles size={22} />}
            iconStyle="accent"
            badge="Recommended"
            title="Join the Community"
            description="Create your account with a phone number and get immediate access to learning, coding, and networking."
            ctaLabel="Get started"
            ctaVariant="primary"
            userIntent={UserIntent.TAKE_FIRST_STEP}
            systemIntents={[SystemIntent.SALES_FUNNEL, SystemIntent.FRICTIONLESS_ONBOARDING]}
            onSelect={onJoinCommunity}
          />

          {/* Path 3 — ACCESS_SYSTEM_DESKTOP */}
          <IntentCard
            icon={<LogIn size={22} />}
            iconStyle="muted"
            title="Log In"
            description="Return to your workspace — courses, projects, and community discussions."
            ctaLabel="Sign in"
            ctaVariant="secondary"
            userIntent={UserIntent.ACCESS_SYSTEM_DESKTOP}
            systemIntents={[SystemIntent.FAST_TIME_TO_VALUE]}
            onSelect={onReturningUser}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal — IntentCard
// ---------------------------------------------------------------------------

type IconStyle = 'accent' | 'muted';
type CtaVariant = 'primary' | 'secondary';

type IntentCardProps = {
  icon: ReactNode;
  iconStyle: IconStyle;
  badge?: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaVariant: CtaVariant;
  userIntent: UserIntent;
  systemIntents: SystemIntent[];
  onSelect: () => void;
};

function IntentCard({
  icon,
  iconStyle,
  badge,
  title,
  description,
  ctaLabel,
  ctaVariant,
  onSelect,
}: IntentCardProps) {
  return (
    <div
      className="relative flex w-full max-w-xs flex-col items-start gap-4 rounded-2xl border p-6 text-left"
      style={{
        background: 'var(--panel-surface)',
        borderColor: 'var(--panel-border)',
      }}
    >
      {badge ? (
        <span
          className="absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: 'var(--panel-accent-bg)',
            color: 'var(--panel-accent-text)',
            border: '1px solid var(--panel-accent-border)',
          }}
        >
          {badge}
        </span>
      ) : null}

      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={
          iconStyle === 'accent'
            ? {
                background: 'var(--panel-accent-bg)',
                border: '1px solid var(--panel-accent-border)',
                color: 'var(--panel-accent-text)',
              }
            : {
                background: 'var(--panel-bg-hover)',
                border: '1px solid var(--panel-border)',
                color: 'var(--panel-text)',
              }
        }
      >
        {icon}
      </div>

      <h3
        className="text-base font-semibold leading-snug"
        style={{ color: 'var(--panel-heading)' }}
      >
        {title}
      </h3>

      <p
        className="flex-1 text-sm leading-relaxed"
        style={{ color: 'var(--panel-text-muted)' }}
      >
        {description}
      </p>

      <SovereignButton
        type="button"
        variant={ctaVariant}
        className="mt-1 w-full"
        onClick={onSelect}
      >
        {ctaLabel}
      </SovereignButton>
    </div>
  );
}
