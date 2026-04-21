import { useMemo } from 'react';
import type { SessionEntryClassification } from '../core/shell/sessionEntryClassification';
import { resolveShellJourneySnapshot, type ShellJourneyAppMode, type ShellJourneySnapshot } from './shellJourneySnapshot';

type WorkspaceCanvas = { view?: string } | null | undefined;

export type UseShellJourneyParams = {
  authSessionActive: boolean;
  shellSessionStarted: boolean;
  sessionEntryClassification: SessionEntryClassification;
  mode: ShellJourneyAppMode;
  workspaceCanvas: WorkspaceCanvas;
  showVibeHero: boolean;
  voiceRouteLabel: string;
  loyaltyState: 'user_first' | 'platform_first';
};

export function useShellJourney(params: UseShellJourneyParams): ShellJourneySnapshot {
  return useMemo(
    () =>
      resolveShellJourneySnapshot({
        authSessionActive: params.authSessionActive,
        shellSessionStarted: params.shellSessionStarted,
        sessionEntryClassification: params.sessionEntryClassification,
        mode: params.mode,
        workspaceCanvas: params.workspaceCanvas,
        showVibeHero: params.showVibeHero,
        voiceRouteLabel: params.voiceRouteLabel,
        loyaltyState: params.loyaltyState,
      }),
    [
      params.authSessionActive,
      params.shellSessionStarted,
      params.sessionEntryClassification,
      params.mode,
      params.workspaceCanvas,
      params.showVibeHero,
      params.voiceRouteLabel,
      params.loyaltyState,
    ],
  );
}
