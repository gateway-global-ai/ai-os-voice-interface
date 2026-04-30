/**
 * Pre-OTP framing for the Vibe Coding University guest path — explains phone verify
 * before opening the raw AuthPanel.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { SovereignButton, SovereignDescription, SovereignTitle } from '../../ui-core';

type Props = {
  preferredModeLabel: 'voice' | 'chat';
  onContinueWithPhone: () => void;
  onBack: () => void;
};

export function VibeJoinCommunityCard({ preferredModeLabel, onContinueWithPhone, onBack }: Props) {
  return (
    <div
      className="flex w-full max-w-md flex-col gap-6 rounded-2xl border p-6 shadow-2xl"
      style={{
        background: 'var(--vcu-community-detail-card-bg)',
        borderColor: 'var(--vcu-community-card-border)',
      }}
    >
      <SovereignTitle level={2} className="text-[var(--vcu-community-heading)]">
        Join the Vibe Coding community
      </SovereignTitle>
      <SovereignDescription className="text-[var(--vcu-community-text-muted)]">
        We are glad you are here. Next is a quick phone check: we text you a six-digit code once. That keeps bots out,
        saves your spot, and sets your default to {preferredModeLabel} when you land in the shell. We do not charge for
        the verification text; your carrier's normal rates may apply.
      </SovereignDescription>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <SovereignButton variant="secondary" className="sm:flex-1" onClick={onBack}>
          Back to intro
        </SovereignButton>
        <SovereignButton variant="primary" className="sm:flex-1" onClick={onContinueWithPhone}>
          Continue with phone
        </SovereignButton>
      </div>
    </div>
  );
}
