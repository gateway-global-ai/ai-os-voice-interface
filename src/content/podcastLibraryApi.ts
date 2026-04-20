import type { PodcastEpisode } from './podcastEpisodes';

export type UploadedPodcastEpisode = PodcastEpisode & {
  addedAt: string;
};

type CreatePodcastEpisodePayload = {
  audioFileName: string;
  audioMimeType?: string;
  audioBase64: string;
  transcriptFileName?: string;
  transcriptText?: string;
  title?: string;
  summary?: string;
  series?: string;
  durationLabel?: string;
};

export async function listUploadedPodcastEpisodes(): Promise<UploadedPodcastEpisode[]> {
  const response = await fetch('/__podcast_library_api/episodes');
  if (!response.ok) {
    throw new Error(`Podcast library request failed: ${response.status}`);
  }
  return response.json() as Promise<UploadedPodcastEpisode[]>;
}

export async function createUploadedPodcastEpisode(payload: CreatePodcastEpisodePayload): Promise<UploadedPodcastEpisode> {
  const response = await fetch('/__podcast_library_api/episodes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Podcast upload failed: ${response.status}`);
  }

  return response.json() as Promise<UploadedPodcastEpisode>;
}
