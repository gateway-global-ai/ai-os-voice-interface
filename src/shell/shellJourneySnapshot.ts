/**
 * Canonical shell journey chrome — aligns with AMD-2026-012 (entry vs continuity).
 * Pure derivation from existing runtime signals (no mock journey store).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { SessionEntryClassification } from '../core/shell/sessionEntryClassification';

/** Mirror of App voice/shell surface modes — kept local to avoid importing App.tsx. */
export type ShellJourneyAppMode =
  | 'voice'
  | 'chat'
  | 'visual'
  | 'voice_settings'
  | 'disc_settings'
  | 'intent_settings'
  | 'api_health'
  | 'appearance'
  | 'voice_control'
  | 'knowledge'
  | 'user_storage'
  | 'transparency'
  | 'podcasts'
  | 'create_account'
  | 'coding_agent';

/** Narrow union for journey stages used in chrome; extend as product adds stages. */
export type ShellJourneyStageId =
  | 'entry_guest_vibe'
  | 'entry_guest_surface'
  | 'entry_authenticated_presession'
  | 'direction_workspace'
  | 'shell_operational';

export type ShellJourneySnapshot = {
  stageId: ShellJourneyStageId;
  /** Header center pill — journey plane, not TTS route name. */
  primaryLabel: string;
  /** Footer compact line under Status — next step / journey, not loyalty tier. */
  footerLine: string;
  /** Drawer / tooltip line for routing or loyalty honesty. */
  disclosureLine: string;
  /** One line for voice / LLM grounding. */
  nextStepHint: string;
};

type WorkspaceCanvas = { view?: string } | null | undefined;

export type ShellJourneyInputs = {
  authSessionActive: boolean;
  shellSessionStarted: boolean;
  sessionEntryClassification: SessionEntryClassification;
  mode: ShellJourneyAppMode;
  workspaceCanvas: WorkspaceCanvas;
  showVibeHero: boolean;
  voiceRouteLabel: string;
  loyaltyState: 'user_first' | 'platform_first';
};

export function resolveShellJourneySnapshot(p: ShellJourneyInputs): ShellJourneySnapshot {
  const loyaltyDisclosure =
    p.loyaltyState === 'user_first'
      ? 'Loyalty: user-first prompt boundary.'
      : 'Loyalty: platform-first prompt boundary.';
  const voiceDisclosure = `Voice output route: ${p.voiceRouteLabel}.`;

  if (!p.authSessionActive) {
    if (p.showVibeHero && p.mode === 'voice') {
      const isNew = p.sessionEntryClassification === 'new';
      return {
        stageId: 'entry_guest_vibe',
        primaryLabel: isNew ? 'Guest · first visit' : 'Guest · returning',
        footerLine: isNew
          ? 'Play welcome, explore topics, or verify to unlock the full shell.'
          : 'Welcome back — pick up where you left off or verify to continue.',
        disclosureLine: `${voiceDisclosure} ${loyaltyDisclosure}`,
        nextStepHint: isNew
          ? 'You are on the public Vibe landing; offer welcome audio, topics, then phone verification.'
          : 'They have been here on this browser before — welcome them back warmly; invite topics or light verify when ready.',
      };
    }
    return {
      stageId: 'entry_guest_surface',
      primaryLabel: 'Guest shell',
      footerLine: 'Explore public routes or verify to unlock workspace and settings.',
      disclosureLine: `${voiceDisclosure} ${loyaltyDisclosure}`,
      nextStepHint: 'Guest is browsing a non-hero shell surface; keep responses scoped to public disclosure.',
    };
  }

  if (p.workspaceCanvas?.view) {
    const view = p.workspaceCanvas.view.replace(/_/g, ' ');
    return {
      stageId: 'direction_workspace',
      primaryLabel: 'Workspace',
      footerLine: `Active canvas: ${view}`,
      disclosureLine: `${voiceDisclosure} ${loyaltyDisclosure}`,
      nextStepHint: `Workspace view ${p.workspaceCanvas.view} is open; prioritize workspace tasks.`,
    };
  }

  if (!p.shellSessionStarted && p.mode === 'voice' && !p.showVibeHero) {
    return {
      stageId: 'entry_authenticated_presession',
      primaryLabel: 'Signed in · pre-session',
      footerLine: 'Choose voice or chat, or open the shell menu to continue.',
      disclosureLine: `${voiceDisclosure} ${loyaltyDisclosure}`,
      nextStepHint: 'Operator is verified but session not started; orient without assuming workspace intent.',
    };
  }

  return {
    stageId: 'shell_operational',
    primaryLabel: 'AI OS session',
    footerLine: p.mode === 'chat' ? 'Chat lane — type to send.' : 'Voice lane — hold to speak.',
    disclosureLine: `${voiceDisclosure} ${loyaltyDisclosure}`,
    nextStepHint: 'Standard operating session; follow kernel intent and governed disclosure.',
  };
}
