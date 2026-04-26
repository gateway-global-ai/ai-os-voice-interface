import type { AppMode, ShellAudioCue, SystemStatus } from './appTypes';

/**
 * Guest shell or signed-in pre-session vibe landing - route LLM to marketing host prompts,
 * not Governor / screen-grounding prompts.
 */
export function isVibePublicShellSurface(p: {
  authSessionActive: boolean;
  shellSessionStarted: boolean;
  mode: AppMode;
  workspaceCanvas: unknown;
  showDiagnosticsChrome: boolean;
  status: SystemStatus;
  showLoyaltyIntro: boolean;
  currentAudioCue: ShellAudioCue | null;
  isPTTActive: boolean;
  transcription: string;
  landingWelcomeActive: boolean;
}): boolean {
  if (!p.authSessionActive) {
    return (
      p.mode === 'voice' &&
      !p.workspaceCanvas &&
      !p.showDiagnosticsChrome &&
      p.status !== 'processing' &&
      (p.status !== 'speaking' ||
        p.currentAudioCue?.source === 'onboarding' ||
        p.currentAudioCue?.source === 'landing' ||
        p.landingWelcomeActive) &&
      !(p.isPTTActive && p.status === 'listening') &&
      !p.transcription.trim()
    );
  }
  return (
    !p.shellSessionStarted &&
    p.mode === 'voice' &&
    !p.workspaceCanvas &&
    !p.showDiagnosticsChrome &&
    p.status !== 'processing' &&
    (p.status !== 'speaking' || p.showLoyaltyIntro || p.currentAudioCue?.source === 'onboarding') &&
    !(p.isPTTActive && p.status === 'listening') &&
    !p.transcription.trim()
  );
}
