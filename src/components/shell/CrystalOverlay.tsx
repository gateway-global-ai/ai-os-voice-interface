import { SovereignButton, SovereignCard, SovereignDescription, SovereignTitle } from '../../ui-core';

export function CrystalOverlay({ onClose }: { onClose: () => void }) {
  return (
    <SovereignCard className="relative z-20 w-full mx-0 text-center">
      <div className="mb-8 flex justify-center">
        <div className="w-16 h-1 bg-emerald-500/20 rounded-full" />
      </div>
      <SovereignTitle level={2} className="mb-4">Visual mode</SovereignTitle>
      <SovereignDescription className="mb-4 max-w-lg mx-auto text-base">
        The shell is voice-first: speak or type here, use Menu for settings, and open Google Workspace only when you
        need it - it stays subordinate to the shell.
      </SovereignDescription>
      <SovereignDescription variant="muted" className="mb-8 max-w-lg mx-auto">
        This screen is optional. Use it when you want a larger layout; most day-to-day use stays in the voice shell.
        If your browser cannot use the microphone, switch to <strong style={{ color: 'var(--panel-heading)' }}>Chat</strong> (bottom
        left) to type instead.
      </SovereignDescription>
      <SovereignButton onClick={onClose} variant="primary" className="px-10">
        Continue in voice
      </SovereignButton>
    </SovereignCard>
  );
}
