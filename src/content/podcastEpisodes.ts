export type PodcastEpisode = {
  id: string;
  title: string;
  durationLabel: string;
  summary: string;
  sourcePath: string;
  playbackPath?: string;
  series: string;
  transcriptPath?: string;
  transcriptPreviewPath?: string;
  coverImagePath?: string;
  coverPrompt?: string;
};

export const podcastEpisodes: PodcastEpisode[] = [
  {
    id: 'fatal-cost-ai-engagement-loops',
    title: 'The Fatal Cost of AI Engagement Loops',
    durationLabel: '6:26',
    summary:
      'An alarm-bell briefing on engagement loops, beneficiary drift, and why conversational motion cannot be mistaken for human progress.',
    sourcePath: 'C:/Apps/ai_os_rust/assets/audio_tts/The Fatal Cost of AI Engagement Loops.mp3',
    playbackPath: '/audio/fatal-cost-ai-engagement-loops.mp3',
    transcriptPath: 'C:/Apps/ai_os_rust/assets/docs.md',
    transcriptPreviewPath: '/transcripts/fatal-cost-ai-engagement-loops.md',
    series: 'AI OS Research Audio',
    coverImagePath: '/images/podcast-fatal-cost-ai-engagement-loops-cover.svg',
    coverPrompt:
      'Square podcast cover in a dark AI OS theme. Deep navy-black background, subtle glass surfaces, cyan and electric-blue glow, abstract labyrinth loop turning into a waveform, restrained emerald highlights, high contrast, cinematic but minimal, no stock-photo people, no clutter, consistent with sovereign AI research branding.',
  },
];
