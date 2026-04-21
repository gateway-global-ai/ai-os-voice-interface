/**
 * Unified system instructions for Vibe Coders / Vibe Coding University host path.
 * Keeps Governor + Commander personas off guest and public marketing surfaces.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { SessionEntryClassification } from '../core/shell/sessionEntryClassification';
import type { ShellJourneySnapshot } from './shellJourneySnapshot';
import vibeCustomerJourneySource from './vibeCustomerJourney.md?raw';

const DEFAULT_JOURNEY_MAX = 3500;

/** Optional display name before OTP — operator-chosen, not verified identity. */
export const VIBE_GUEST_DISPLAY_NAME_KEY = 'aios.vibe.display_name';

export function readVibeGuestDisplayName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(VIBE_GUEST_DISPLAY_NAME_KEY)?.trim();
    return v ? v.slice(0, 48) : null;
  } catch {
    return null;
  }
}

export function writeVibeGuestDisplayName(name: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const t = name?.trim().slice(0, 48) ?? '';
    if (!t) localStorage.removeItem(VIBE_GUEST_DISPLAY_NAME_KEY);
    else localStorage.setItem(VIBE_GUEST_DISPLAY_NAME_KEY, t);
  } catch {
    /* ignore */
  }
}

export function getVibeCustomerJourneyBlock(maxChars = DEFAULT_JOURNEY_MAX): string {
  const raw = (vibeCustomerJourneySource ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) return '';
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, maxChars)}\n\n[… journey excerpt truncated for model context …]`;
}

export function formatShellJourneyYouAreHere(
  snapshot: ShellJourneySnapshot,
  extras?: { kernelCurrentIntent?: string | null },
): string {
  const lines = [
    'YOU ARE HERE (shell journey — ground every answer in this; do not contradict it):',
    `stageId: ${snapshot.stageId}`,
    `primaryLabel: ${snapshot.primaryLabel}`,
    `footerLine: ${snapshot.footerLine}`,
    `nextStepHint: ${snapshot.nextStepHint}`,
    `disclosureLine: ${snapshot.disclosureLine}`,
  ];
  const intent = extras?.kernelCurrentIntent?.trim();
  if (intent) {
    lines.push(`kernelCurrentIntent: ${intent}`);
  }
  return lines.join('\n');
}

export type VibeCodersHostPromptParams = {
  snapshot: ShellJourneySnapshot;
  sessionEntryClassification: SessionEntryClassification;
  /** Optional local-only name (pre-verify). */
  guestDisplayName: string | null;
  /** When authenticated, surface kernel intent for continuity. */
  kernelCurrentIntent?: string | null;
};

/**
 * When true, use Vibe Coders host system prompt instead of Governor / kernel governor stack.
 */
export function shouldUseVibeCodersHostPrompt(p: {
  authSessionActive: boolean;
  showVoiceIdleOrientation: boolean;
  mode: 'podcasts' | string;
}): boolean {
  if (!p.authSessionActive) return true;
  if (p.showVoiceIdleOrientation) return true;
  if (p.mode === 'podcasts') return true;
  return false;
}

export function buildVibeCodersHostSystemPrompt(p: VibeCodersHostPromptParams): string {
  const { snapshot, sessionEntryClassification, guestDisplayName, kernelCurrentIntent } = p;
  const journeyDoc = getVibeCustomerJourneyBlock();
  const youAreHere = formatShellJourneyYouAreHere(snapshot, { kernelCurrentIntent });
  const isReturning = sessionEntryClassification === 'returning';
  const nick = guestDisplayName?.trim();

  const opening = isReturning
    ? nick
      ? `Open with a warm welcome back for ${nick} (this is a nickname they chose on this device — not verified legal identity). One short upbeat sentence.`
      : `Open with a warm welcome back (they have visited this browser before — you do not know their legal name). One short upbeat sentence.`
    : `Open with a friendly first-visit greeting. One short upbeat sentence.`;

  const lines = [
    `You are the upbeat host for **Vibe Coders** exploring **Vibe Coding University** — curious builders, not enterprise trainees.`,
    `Voice: conversational, encouraging, slightly playful; short sentences; no lecturing.`,
    opening,
    `Never call yourself "AIOS Governor", "Governor", or similar. Never call the user "Commander". Do not discuss governance doctrine unless they explicitly ask.`,
    `Do not invent UI that is not on this surface. If unsure, ask one short clarifying question.`,
    `At most four short sentences unless the user asks for detail. No markdown, bullets, or headers in spoken-style output.`,
    ``,
    youAreHere,
    ``,
    `CUSTOMER_JOURNEY (authoritative excerpt):`,
    journeyDoc || '(No journey excerpt configured.)',
  ];

  return lines.join('\n');
}

/**
 * Screen image attached — still Vibe Coders voice: helpful, not Governor, minimal ARCH jargon.
 */
export function buildVibeCodersScreenBuddyPrompt(
  snapshot: ShellJourneySnapshot,
  guestDisplayName: string | null,
  kernelCurrentIntent?: string | null,
): string {
  const youAreHere = formatShellJourneyYouAreHere(snapshot, { kernelCurrentIntent });
  const nick = guestDisplayName?.trim();
  return [
    `You help **Vibe Coders** who attached a screenshot. Be concise and practical.`,
    `Not the AIOS Governor. Do not say "Commander".${nick ? ` If needed, address them as ${nick}.` : ''}`,
    `Describe only what is plausibly visible; if unclear, say so in one phrase.`,
    `Max four short sentences. No markdown.`,
    ``,
    youAreHere,
  ].join('\n');
}
