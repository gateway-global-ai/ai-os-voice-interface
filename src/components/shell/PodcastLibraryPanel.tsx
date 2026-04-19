import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Link2, Loader2, Mic2, Radio, Upload, X } from 'lucide-react';
import { createUploadedPodcastEpisode, listUploadedPodcastEpisodes } from '../../content/podcastLibraryApi';
import { podcastEpisodes, type PodcastEpisode } from '../../content/podcastEpisodes';

function resolveAudioSrc(path: string): string {
  if (/^(?:https?:|data:|blob:|\/)/i.test(path)) {
    return path;
  }
  const normalized = path.replace(/\\/g, '/');
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    return `http://asset.localhost/${encodeURIComponent(normalized)}`;
  }
  return `file:///${normalized.replace(/^\/+/, '')}`;
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name);
}

function isTranscriptFile(file: File): boolean {
  return file.type.startsWith('text/') || /\.(md|markdown|txt)$/i.test(file.name);
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read text file'));
    reader.readAsText(file);
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to encode audio file'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function getAudioDurationLabel(file: File): Promise<string> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.src = objectUrl;
    audio.onloadedmetadata = () => {
      const totalSeconds = Math.max(0, Math.round(audio.duration || 0));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      URL.revokeObjectURL(objectUrl);
      resolve(`${minutes}:${String(seconds).padStart(2, '0')}`);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('New');
    };
  });
}

function buildShareUrl(id: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('podcast', id);
  return url.toString();
}

type PodcastLibraryPanelProps = {
  onClose: () => void;
};

export function PodcastLibraryPanel({ onClose }: PodcastLibraryPanelProps) {
  const [transcriptById, setTranscriptById] = useState<Record<string, string | null | undefined>>({});
  const [loadingTranscriptId, setLoadingTranscriptId] = useState<string | null>(null);
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, true>>({});
  const [uploadedEpisodes, setUploadedEpisodes] = useState<PodcastEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [pendingTranscriptFile, setPendingTranscriptFile] = useState<File | null>(null);
  const [uploadingEpisodeTitle, setUploadingEpisodeTitle] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const episodes = await listUploadedPodcastEpisodes();
        if (alive) {
          setUploadedEpisodes(episodes);
        }
      } catch {
        if (alive) {
          setUploadedEpisodes([]);
        }
      } finally {
        if (alive) {
          setLoadingEpisodes(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const episodes = useMemo(() => [...podcastEpisodes, ...uploadedEpisodes], [uploadedEpisodes]);

  const ingestFiles = (files: FileList | File[]) => {
    const allFiles = Array.from(files);
    const audio = allFiles.find(isAudioFile) ?? null;
    const transcript = allFiles.find(isTranscriptFile) ?? null;

    if (!audio) {
      setUploadError('Drop an audio file (.mp3, .wav, .m4a, .aac, .ogg). You can also include a .md or .txt transcript.');
      return;
    }

    setPendingAudioFile(audio);
    setPendingTranscriptFile(transcript);
    setUploadError(null);
    setShowUploader(true);
  };

  const toggleTranscript = async (episodeId: string, transcriptPreviewPath?: string) => {
    if (transcriptById[episodeId] !== undefined) {
      setTranscriptById((current) => {
        const next = { ...current };
        delete next[episodeId];
        return next;
      });
      return;
    }

    if (!transcriptPreviewPath) {
      setTranscriptById((current) => ({
        ...current,
        [episodeId]: null,
      }));
      return;
    }

    setLoadingTranscriptId(episodeId);
    try {
      const response = await fetch(transcriptPreviewPath);
      if (!response.ok) {
        throw new Error(`Transcript request failed: ${response.status}`);
      }
      const text = await response.text();
      setTranscriptById((current) => ({
        ...current,
        [episodeId]: text,
      }));
    } catch {
      setTranscriptById((current) => ({
        ...current,
        [episodeId]: null,
      }));
    } finally {
      setLoadingTranscriptId((current) => (current === episodeId ? null : current));
    }
  };

  const handlePublishEpisode = async () => {
    if (!pendingAudioFile) {
      setUploadError('Choose an audio file to publish.');
      return;
    }

    setUploadError(null);
    const title = titleFromFilename(pendingAudioFile.name);
    setUploadingEpisodeTitle(title);

    try {
      const [audioBase64, durationLabel, transcriptText] = await Promise.all([
        readFileAsBase64(pendingAudioFile),
        getAudioDurationLabel(pendingAudioFile),
        pendingTranscriptFile ? readFileAsText(pendingTranscriptFile) : Promise.resolve(undefined),
      ]);

      const episode = await createUploadedPodcastEpisode({
        audioFileName: pendingAudioFile.name,
        audioMimeType: pendingAudioFile.type,
        audioBase64,
        transcriptFileName: pendingTranscriptFile?.name,
        transcriptText,
        title,
        durationLabel,
      });

      setUploadedEpisodes((current) => [...current, episode]);
      setPendingAudioFile(null);
      setPendingTranscriptFile(null);
      setShowUploader(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Podcast upload failed');
    } finally {
      setUploadingEpisodeTitle(null);
    }
  };

  const handleShareEpisode = async (episodeId: string) => {
    const shareUrl = buildShareUrl(episodeId);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareNotice('Share link copied.');
    } catch {
      setShareNotice(shareUrl);
    }
    window.setTimeout(() => setShareNotice(null), 2500);
  };

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden shadow-2xl"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--panel-border)' }}
      >
        <div className="min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--panel-text-muted)' }}
          >
            AI OS Library
          </p>
          <h2 className="text-sm font-bold" style={{ color: 'var(--panel-heading)' }}>
            Podcast Episodes
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--panel-text-muted)' }}>
            Shared research audio episodes with public playback URLs.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--panel-text-muted)', background: 'transparent' }}
          aria-label="Close podcast library"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--panel-surface)',
            border: '1px solid var(--panel-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: 'var(--panel-accent-bg)',
                border: '1px solid var(--panel-accent-border)',
                color: 'var(--panel-accent-text)',
              }}
            >
              <Radio size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
                Research Audio Library
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                Upload an episode here, publish it into the main podcast library, and then copy a public share URL from the card.
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--panel-surface)',
            border: '1px solid var(--panel-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: 'var(--panel-accent-bg)',
                border: '1px solid var(--panel-accent-border)',
                color: 'var(--panel-accent-text)',
              }}
            >
              <Upload size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
                Add Episode
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                Click Add Episode, drop the audio file and optional transcript, and the published card will appear below when processing finishes.
              </p>
              <button
                type="button"
                onClick={() => setShowUploader((current) => !current)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
              >
                <Upload size={14} />
                {showUploader ? 'Close uploader' : 'Add episode'}
              </button>
            </div>
          </div>

          {showUploader ? (
            <div className="mt-4 space-y-3">
              <div
                className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl p-6 text-center transition-all"
                style={{
                  background: dragOver ? 'var(--panel-accent-bg)' : 'var(--panel-bg)',
                  border: `2px dashed ${dragOver ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  ingestFiles(event.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingEpisodeTitle ? (
                  <>
                    <Loader2 size={28} className="animate-spin" style={{ color: 'var(--panel-accent-text)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--panel-text)' }}>
                      Processing {uploadingEpisodeTitle}...
                    </p>
                  </>
                ) : (
                  <>
                    <Upload size={28} style={{ color: dragOver ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--panel-text)' }}>
                      Drop an audio file here or click to browse
                    </p>
                    <p className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>
                      You can include the transcript in the same drop. Supported transcript files: .md and .txt
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".mp3,.wav,.m4a,.aac,.ogg,.md,.txt,.markdown"
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files?.length) {
                      ingestFiles(event.target.files);
                    }
                    event.currentTarget.value = '';
                  }}
                />
              </div>

              {(pendingAudioFile || pendingTranscriptFile) && !uploadingEpisodeTitle ? (
                <div
                  className="rounded-xl p-3 text-xs"
                  style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--panel-text-muted)' }}
                >
                  <p>Audio: {pendingAudioFile?.name ?? 'Not selected yet'}</p>
                  <p className="mt-1">Transcript: {pendingTranscriptFile?.name ?? 'Optional - not selected'}</p>
                </div>
              ) : null}

              {uploadError ? (
                <div
                  className="rounded-xl px-3 py-2 text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
                >
                  {uploadError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handlePublishEpisode()}
                  disabled={!pendingAudioFile || !!uploadingEpisodeTitle}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{
                    background: 'var(--panel-accent-bg)',
                    border: '1px solid var(--panel-accent-border)',
                    color: 'var(--panel-accent-text)',
                  }}
                >
                  <Upload size={14} />
                  Publish episode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingAudioFile(null);
                    setPendingTranscriptFile(null);
                    setUploadError(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                  style={{
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--panel-text-muted)',
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 pb-6">
          {shareNotice ? (
            <div
              className="rounded-xl px-3 py-2 text-xs"
              style={{ background: 'var(--panel-accent-bg)', border: '1px solid var(--panel-accent-border)', color: 'var(--panel-accent-text)' }}
            >
              {shareNotice}
            </div>
          ) : null}

          {loadingEpisodes ? (
            <div
              className="rounded-2xl p-4 text-sm"
              style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)', color: 'var(--panel-text-muted)' }}
            >
              Loading published episodes...
            </div>
          ) : null}

          {episodes.map((episode) => (
            <article
              key={episode.id}
              className="rounded-2xl p-4"
              style={{
                background: 'var(--panel-surface)',
                border: '1px solid var(--panel-border)',
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row">
                <div
                  className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl md:w-32"
                  style={{
                    background:
                      'radial-gradient(circle at top, rgba(34,211,238,0.25), rgba(15,23,42,0.9) 60%), linear-gradient(135deg, rgba(17,24,39,1), rgba(12,18,35,1))',
                    border: '1px solid var(--panel-border)',
                  }}
                >
                  {episode.coverImagePath && !failedCoverIds[episode.id] ? (
                    <img
                      src={episode.coverImagePath}
                      alt={`${episode.title} cover`}
                      className="h-full w-full object-cover"
                      onError={() => {
                        setFailedCoverIds((current) => ({
                          ...current,
                          [episode.id]: true,
                        }));
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-3 text-center">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{
                          background: 'var(--panel-accent-bg)',
                          border: '1px solid var(--panel-accent-border)',
                          color: 'var(--panel-accent-text)',
                        }}
                      >
                        <Mic2 size={18} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                        AI OS Audio
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{
                        background: 'var(--panel-accent-bg)',
                        border: '1px solid var(--panel-accent-border)',
                        color: 'var(--panel-accent-text)',
                      }}
                    >
                      <Mic2 size={12} />
                      {episode.series}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--panel-text-muted)' }}>
                      {episode.durationLabel}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold" style={{ color: 'var(--panel-heading)' }}>
                    {episode.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                    {episode.summary}
                  </p>

                  <div className="mt-4">
                    <audio
                      controls
                      preload="metadata"
                      className="w-full"
                      src={resolveAudioSrc(episode.playbackPath ?? episode.sourcePath)}
                    >
                      Your browser could not load this local podcast file.
                    </audio>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleTranscript(episode.id, episode.transcriptPreviewPath)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                      style={{
                        background: 'var(--panel-accent-bg)',
                        border: '1px solid var(--panel-accent-border)',
                        color: 'var(--panel-accent-text)',
                      }}
                    >
                      <FileText size={14} />
                      {transcriptById[episode.id] !== undefined ? 'Hide transcript' : 'Show transcript'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShareEpisode(episode.id)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                      style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        color: 'var(--panel-text-muted)',
                      }}
                    >
                      <Link2 size={14} />
                      Share URL
                    </button>
                  </div>

                  {loadingTranscriptId === episode.id ? (
                    <div
                      className="mt-4 rounded-2xl p-4 text-sm"
                      style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        color: 'var(--panel-text-muted)',
                      }}
                    >
                      Loading transcript...
                    </div>
                  ) : null}

                  {transcriptById[episode.id] !== undefined ? (
                    <div
                      className="mt-4 rounded-2xl p-4"
                      style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                      }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                        Transcript
                      </p>
                      <div
                        className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed"
                        style={{ color: 'var(--panel-text)' }}
                      >
                        {transcriptById[episode.id] ?? 'Transcript preview is not available for this episode yet.'}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 space-y-1">
                    <p className="break-all text-[11px]" style={{ color: 'var(--panel-text-muted)' }}>
                      Audio: {episode.sourcePath}
                    </p>
                    {episode.transcriptPath ? (
                      <p className="break-all text-[11px]" style={{ color: 'var(--panel-text-muted)' }}>
                        Transcript: {episode.transcriptPath}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {uploadingEpisodeTitle ? (
            <article
              className="rounded-2xl p-4"
              style={{
                background: 'var(--panel-surface)',
                border: '1px solid var(--panel-border)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
                {uploadingEpisodeTitle}
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--panel-text-muted)' }}>
                Processing episode and publishing it to the library...
              </p>
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
}
