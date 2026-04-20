import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

export type PodcastLibraryEpisodeRecord = {
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
  addedAt: string;
};

export type CreatePodcastEpisodePayload = {
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

const storageRoot = resolve(process.cwd(), 'public', 'podcast-library');
const audioDir = join(storageRoot, 'audio');
const transcriptDir = join(storageRoot, 'transcripts');
const libraryFile = join(storageRoot, 'library.json');

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `podcast-${Date.now()}`;
}

function titleCaseFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function summarizeTranscript(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'A newly uploaded research audio episode.';
  }
  const sentence = normalized.split(/(?<=[.!?])\s+/)[0] ?? normalized;
  return sentence.slice(0, 180);
}

async function ensureStorage(): Promise<void> {
  await mkdir(audioDir, { recursive: true });
  await mkdir(transcriptDir, { recursive: true });
}

export async function listPodcastEpisodes(): Promise<PodcastLibraryEpisodeRecord[]> {
  await ensureStorage();
  if (!existsSync(libraryFile)) {
    return [];
  }

  try {
    const raw = await readFile(libraryFile, 'utf8');
    const parsed = JSON.parse(raw) as PodcastLibraryEpisodeRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePodcastEpisodes(records: PodcastLibraryEpisodeRecord[]): Promise<void> {
  await ensureStorage();
  await writeFile(libraryFile, JSON.stringify(records, null, 2), 'utf8');
}

export async function createPodcastEpisode(payload: CreatePodcastEpisodePayload): Promise<PodcastLibraryEpisodeRecord> {
  await ensureStorage();

  const title = payload.title?.trim() || titleCaseFromFilename(payload.audioFileName);
  const id = slugify(title);
  const audioExt = extname(payload.audioFileName || '').toLowerCase() || '.mp3';
  const audioFileName = `${id}${audioExt}`;
  const audioFsPath = join(audioDir, audioFileName);
  const audioPublicPath = `/podcast-library/audio/${audioFileName}`;

  const audioBuffer = Buffer.from(payload.audioBase64, 'base64');
  await writeFile(audioFsPath, audioBuffer);

  let transcriptPath: string | undefined;
  let transcriptPreviewPath: string | undefined;
  if (payload.transcriptText?.trim()) {
    const transcriptFileName = `${id}.md`;
    const transcriptFsPath = join(transcriptDir, transcriptFileName);
    await writeFile(transcriptFsPath, payload.transcriptText, 'utf8');
    transcriptPath = resolve(transcriptFsPath);
    transcriptPreviewPath = `/podcast-library/transcripts/${transcriptFileName}`;
  }

  const records = await listPodcastEpisodes();
  const record: PodcastLibraryEpisodeRecord = {
    id,
    title,
    durationLabel: payload.durationLabel?.trim() || 'New',
    summary: payload.summary?.trim() || summarizeTranscript(payload.transcriptText ?? ''),
    sourcePath: resolve(audioFsPath),
    playbackPath: audioPublicPath,
    series: payload.series?.trim() || 'AI OS Research Audio',
    transcriptPath,
    transcriptPreviewPath,
    addedAt: new Date().toISOString(),
  };

  const nextRecords = [...records.filter((item) => item.id !== record.id), record];
  await savePodcastEpisodes(nextRecords);
  return record;
}
