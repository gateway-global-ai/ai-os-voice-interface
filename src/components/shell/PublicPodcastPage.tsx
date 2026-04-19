import { useEffect, useMemo, useState } from 'react';
import { FileText, Mic2 } from 'lucide-react';
import { listUploadedPodcastEpisodes } from '../../content/podcastLibraryApi';
import { podcastEpisodes, type PodcastEpisode } from '../../content/podcastEpisodes';

function resolveAudioSrc(path: string): string {
  if (/^(?:https?:|data:|blob:|\/)/i.test(path)) {
    return path;
  }
  const normalized = path.replace(/\\/g, '/');
  return `file:///${normalized.replace(/^\/+/, '')}`;
}

type Props = {
  episodeId: string;
};

export function PublicPodcastPage({ episodeId }: Props) {
  const [uploadedEpisodes, setUploadedEpisodes] = useState<PodcastEpisode[]>([]);
  const [transcriptText, setTranscriptText] = useState<string | null>(null);
  const [failedCover, setFailedCover] = useState(false);

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
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const episode = useMemo(
    () => [...podcastEpisodes, ...uploadedEpisodes].find((item) => item.id === episodeId) ?? null,
    [episodeId, uploadedEpisodes],
  );

  useEffect(() => {
    let alive = true;
    setTranscriptText(null);
    if (!episode?.transcriptPreviewPath) {
      return () => {
        alive = false;
      };
    }

    void (async () => {
      try {
        const response = await fetch(episode.transcriptPreviewPath!);
        if (!response.ok) return;
        const text = await response.text();
        if (alive) setTranscriptText(text);
      } catch {
        if (alive) setTranscriptText(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [episode]);

  if (!episode) {
    return (
      <div className="min-h-screen bg-[#0b1220] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80">AI OS Public Audio</p>
          <h1 className="mt-3 text-3xl font-black">Podcast not found</h1>
          <p className="mt-3 text-sm text-slate-300">This share link does not match a published podcast entry on this host.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),rgba(11,18,32,1)_55%)] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300/80">AI OS Public Audio</p>
          <h1 className="mt-3 text-3xl font-black">{episode.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{episode.summary}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 backdrop-blur-md">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
              {episode.coverImagePath && !failedCover ? (
                <img
                  src={episode.coverImagePath}
                  alt={`${episode.title} cover`}
                  className="aspect-square w-full object-cover"
                  onError={() => setFailedCover(true)}
                />
              ) : (
                <div className="flex aspect-square flex-col items-center justify-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/15 text-emerald-200">
                    <Mic2 size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">AI OS Audio</span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <p>Series: {episode.series}</p>
              <p>Runtime: {episode.durationLabel}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-md">
              <audio controls preload="metadata" className="w-full" src={resolveAudioSrc(episode.playbackPath ?? episode.sourcePath)}>
                Your browser could not load this podcast audio.
              </audio>
            </div>

            {transcriptText ? (
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-cyan-300" />
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300/80">Transcript</p>
                </div>
                <div className="mt-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {transcriptText}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
