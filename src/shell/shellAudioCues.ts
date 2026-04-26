import type { ShellAudioCue, ShellAudioCueSource } from './appTypes';

export function buildShellAudioCue(
  text: string,
  overrideVoice?: string,
  label?: string,
  source: ShellAudioCueSource = 'agent',
): ShellAudioCue {
  const normalizedLabel =
    label?.trim() ||
    text
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 72) ||
    'Audio cue';

  return {
    id: `cue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
    label: normalizedLabel,
    source,
    status: 'queued',
    createdAt: new Date().toISOString(),
    overrideVoice,
  };
}
