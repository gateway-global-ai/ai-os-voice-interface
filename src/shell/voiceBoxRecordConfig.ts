export const VOICEBOX_SAMPLE_TARGET = 5;

export const VOICEBOX_SAMPLE_PROMPTS = [
  'I am calibrating my voice profile for the local sovereign AI operating system.',
  'Artificial intelligence is transforming the way we interact with technology.',
  'Large language models process complex instructions and generate natural responses.',
  'A truly private AI runs entirely on local hardware without sending data to the cloud.',
  'The system is now learning the unique characteristics and intonations of my voice.',
];

export function voiceboxPromptForCount(sampleCount: number): string {
  return VOICEBOX_SAMPLE_PROMPTS[sampleCount % VOICEBOX_SAMPLE_PROMPTS.length];
}
