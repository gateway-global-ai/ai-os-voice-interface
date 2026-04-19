import { Fragment, useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, ChevronRight, BookOpen, ClipboardList, Volume2, Loader2, AlertCircle, Mic, MicOff } from 'lucide-react';
import { BRAND } from '../config/brand';
import * as VoiceboxClient from '../core/io/VoiceboxClient';
import {
  markLessonComplete,
  markTaskComplete,
  isLessonComplete,
  isTaskComplete,
} from './onboardingState';
import { LESSONS, ONBOARDING_TASKS, type LessonDef } from './lessons';
import { getNarration } from './lessonNarrationOverrides';
import {
  SovereignGrid,
  SovereignCard,
  SovereignTitle,
  SovereignDescription,
  SovereignButton,
} from '../ui-core';

/** Kernel PM task id for Google Workspace (see Rust `ExecuteTaskAction`). */
export const TASK_ID_CONFIG_WORKSPACE = 'config_workspace';

type TtsState = 'idle' | 'loading' | 'error';

/** Active HTMLAudioElement for audio_url playback, so we can stop it cleanly. */
let _activeAudio: HTMLAudioElement | null = null;
const _generatedNarrationAudioById = new Map<string, string>();

function stopActiveAudio() {
  if (_activeAudio) {
    _activeAudio.pause();
    _activeAudio.src = '';
    _activeAudio = null;
  }
}

async function ensureVoiceProfileForTts(): Promise<void> {
  if (VoiceboxClient.getActiveProfileId()) return;
  try {
    const profiles = await VoiceboxClient.listProfiles();
    if (Array.isArray(profiles) && profiles.length > 0) {
      const best = [...profiles].sort((a, b) => (b.sample_count || 0) - (a.sample_count || 0))[0];
      if (best?.id) await VoiceboxClient.setActiveProfile(best.id);
    }
  } catch (e) {
    console.warn('[ScreenPlanetOverview] profile pick for TTS:', e);
  }
}

export interface ScreenPlanetOverviewProps {
  onFinish: () => void;
  /** Dispatch kernel intent (JSON.stringify handled by caller). */
  dispatchIntent: (intentType: string, payload?: unknown) => void;
}

export function ScreenPlanetOverview({ onFinish, dispatchIntent }: ScreenPlanetOverviewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ttsById, setTtsById] = useState<Record<string, TtsState>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const playbackRequestRef = useRef(0);

  /** Play a pre-recorded audio file. Returns a promise that resolves when playback ends. */
  const runAudioFile = useCallback(async (id: string, url: string) => {
    const requestId = ++playbackRequestRef.current;
    setBannerError(null);
    VoiceboxClient.stop();
    stopActiveAudio();
    setTtsById((m) => ({ ...m, [id]: 'loading' }));
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      _activeAudio = audio;
      audio.oncanplaythrough = () => {
        if (playbackRequestRef.current !== requestId) return;
        setTtsById((m) => ({ ...m, [id]: 'idle' }));
      };
      audio.onended = () => {
        if (playbackRequestRef.current !== requestId) {
          resolve();
          return;
        }
        _activeAudio = null;
        setTtsById((m) => ({ ...m, [id]: 'idle' }));
        resolve();
      };
      audio.onerror = () => {
        if (playbackRequestRef.current !== requestId) {
          resolve();
          return;
        }
        _activeAudio = null;
        const msg = `Audio file could not be loaded: ${url}`;
        setTtsById((m) => ({ ...m, [id]: 'error' }));
        setBannerError(msg);
        reject(new Error(msg));
      };
      audio.play().catch((e) => {
        if (playbackRequestRef.current !== requestId) {
          resolve();
          return;
        }
        _activeAudio = null;
        const msg = e instanceof Error ? e.message : String(e);
        setTtsById((m) => ({ ...m, [id]: 'error' }));
        setBannerError(`Audio playback failed: ${msg}`);
        reject(e);
      });
    });
  }, []);

  const runReusableNarration = useCallback(async (id: string, narrationText: string) => {
    setBannerError(null);
    stopActiveAudio();
    VoiceboxClient.stop();
    setTtsById((m) => ({ ...m, [id]: 'loading' }));
    await ensureVoiceProfileForTts();
    try {
      const cachedUrl = _generatedNarrationAudioById.get(id);
      if (cachedUrl) {
        await runAudioFile(id, cachedUrl);
        return;
      }
      const rendered = await VoiceboxClient.synthesizeToObjectUrl(
        narrationText,
        VoiceboxClient.getActiveProfileId() ?? undefined,
      );
      _generatedNarrationAudioById.set(id, rendered.objectUrl);
      await runAudioFile(id, rendered.objectUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[ScreenPlanetOverview] reusable narration failed:', e);
      setTtsById((m) => ({ ...m, [id]: 'error' }));
      setBannerError(`Reusable narration is not pre-generated yet and synthesis failed: ${msg}`);
    }
  }, [runAudioFile]);

  const toggleRow = async (item: LessonDef, kind: 'lesson' | 'task') => {
    const id = `${kind}:${item.id}`;
    if (expandedId === id) {
      setExpandedId(null);
      playbackRequestRef.current += 1;
      VoiceboxClient.stop();
      stopActiveAudio();
      setTtsById((m) => ({ ...m, [id]: 'idle' }));
      return;
    }
    setExpandedId(id);
    if (item.audio_url) {
      await runAudioFile(id, item.audio_url);
    } else {
      await runReusableNarration(id, getNarration(item.id, item.intro_narration));
    }
  };

  const handleWorkspaceAction = () => {
    VoiceboxClient.stop();
    stopActiveAudio();
    dispatchIntent('ExecuteTaskAction', { task_id: TASK_ID_CONFIG_WORKSPACE });
  };

  return (
    <SovereignCard className="flex flex-col gap-8 bg-transparent border-none shadow-none backdrop-blur-none w-full max-w-5xl mx-auto">
      <div className="text-center">
        <p className="text-cyan-400 text-sm uppercase tracking-[0.3em] mb-1">Planet AI OS</p>
        <SovereignTitle level={2}>Welcome, Commander</SovereignTitle>
        <SovereignDescription className="mt-1">
          Begin your orientation or proceed directly to the kernel.
        </SovereignDescription>
      </div>

      {bannerError && (
        <div
          role="alert"
          className={`${BRAND.colors.error} ${BRAND.colors.errorBorder} border rounded-xl px-4 py-3 text-sm flex items-start gap-2`}
        >
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <span>{bannerError}</span>
        </div>
      )}

      <SovereignGrid columns={2} className="items-start text-left gap-8">
        <SovereignCard className={`${BRAND.colors.surface} ${BRAND.sizing.borderRadius}`}>
          <CategoryHeader title="Lessons" icon={<BookOpen size={16} />} />
          <div className="space-y-2 mt-4">
            {LESSONS.map((l) => (
              <Fragment key={l.id}>
                <OverviewItemRow
                  item={l}
                  isComplete={isLessonComplete(l.id)}
                  isExpanded={expandedId === `lesson:${l.id}`}
                  ttsState={ttsById[`lesson:${l.id}`] ?? 'idle'}
                  onToggle={() => void toggleRow(l, 'lesson')}
                  onMarkComplete={() => markLessonComplete(l.id)}
                />
              </Fragment>
            ))}
          </div>
        </SovereignCard>

        <SovereignCard className={`${BRAND.colors.surface} ${BRAND.sizing.borderRadius}`}>
          <CategoryHeader title="Onboarding Tasks" icon={<ClipboardList size={16} />} />
          <div className="space-y-2 mt-4">
            {ONBOARDING_TASKS.map((t) => (
              <Fragment key={t.id}>
                <OverviewItemRow
                  item={t}
                  isComplete={isTaskComplete(t.id)}
                  isExpanded={expandedId === `task:${t.id}`}
                  ttsState={ttsById[`task:${t.id}`] ?? 'idle'}
                  onToggle={() => void toggleRow(t, 'task')}
                  onMarkComplete={() => markTaskComplete(t.id)}
                  actionSlot={
                    t.id === 'configure_google_workspace' ? (
                      <button
                        type="button"
                        className={`mt-2 text-xs px-3 py-2 rounded-xl border font-semibold ${BRAND.colors.secondary} ${BRAND.colors.secondaryBorder} ${BRAND.colors.secondaryHover}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWorkspaceAction();
                        }}
                      >
                        Open workspace setup
                      </button>
                    ) : null
                  }
                />
              </Fragment>
            ))}
          </div>
        </SovereignCard>
      </SovereignGrid>

      <div className="flex justify-center mt-4">
        <SovereignButton onClick={onFinish} variant="primary" className="px-12 py-4">
          Enter the OS <ChevronRight size={18} />
        </SovereignButton>
      </div>

      <PttBar dispatchIntent={dispatchIntent} />
    </SovereignCard>
  );
}

// ─── PTT footer bar ───────────────────────────────────────────────────────────

type PttStatus = 'idle' | 'listening' | 'processing';

function PttBar({
  dispatchIntent,
}: {
  dispatchIntent: (intentType: string, payload?: unknown) => void;
}) {
  const [status, setStatus] = useState<PttStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (!supported || status !== 'idle') return;
    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    rec.onstart = () => setStatus('listening');
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      setTranscript(text);
      setStatus('processing');
      dispatchIntent('SubmitVoiceQuery', { text });
      setTimeout(() => setStatus('idle'), 2500);
    };
    rec.onerror = () => setStatus('idle');
    rec.onend = () => {
      if (status === 'listening') setStatus('idle');
    };
    rec.start();
  }, [supported, status, dispatchIntent]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    if (status === 'listening') setStatus('idle');
  }, [status]);

  if (!supported) return null;

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div
        className="flex w-full max-w-lg items-center gap-4 rounded-2xl border border-white/10 bg-black/30 px-5 py-3 backdrop-blur-sm"
      >
        {/* PTT button */}
        <button
          type="button"
          onPointerDown={startListening}
          onPointerUp={stopListening}
          onPointerLeave={stopListening}
          disabled={status === 'processing'}
          className={`
            relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all
            ${status === 'listening'
              ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_18px_rgba(34,211,238,0.6)] scale-110'
              : status === 'processing'
                ? 'border-violet-400/50 bg-violet-500/15 opacity-70 cursor-not-allowed'
                : 'border-white/20 bg-white/[0.07] hover:border-cyan-400/50 hover:bg-cyan-500/10'}
          `}
          aria-label={status === 'listening' ? 'Release to send' : 'Hold to speak'}
        >
          {status === 'processing'
            ? <Loader2 size={20} className="text-violet-300 animate-spin" />
            : status === 'listening'
              ? <Mic size={20} className="text-cyan-300" />
              : <Mic size={20} className="text-zinc-400" />}
          {status === 'listening' && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </button>

        {/* Status / transcript */}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            {status === 'idle' ? 'Hold to talk' : status === 'listening' ? 'Listening…' : 'Processing…'}
          </p>
          {transcript && (
            <p className="mt-0.5 truncate text-xs text-zinc-300" title={transcript}>
              {transcript}
            </p>
          )}
        </div>

        {/* Mute indicator when not supported */}
        {!supported && <MicOff size={16} className="shrink-0 text-zinc-600" />}
      </div>
    </div>
  );
}

function CategoryHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-cyan-400">{icon}</span>
      <h3 className="text-white font-semibold text-sm uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function OverviewItemRow({
  item,
  isComplete,
  isExpanded,
  ttsState,
  onToggle,
  onMarkComplete,
  actionSlot,
}: {
  item: LessonDef;
  isComplete: boolean;
  isExpanded: boolean;
  ttsState: TtsState;
  onToggle: () => void;
  onMarkComplete: () => void;
  actionSlot?: ReactNode;
}) {
  const speakerIcon =
    ttsState === 'loading' ? (
      <Loader2 size={14} className="text-cyan-400 shrink-0 animate-spin" aria-hidden />
    ) : ttsState === 'error' ? (
      <AlertCircle size={14} className="text-red-400 shrink-0" aria-label="TTS failed" />
    ) : (
      <Volume2 size={14} className="text-gray-500 shrink-0" aria-hidden />
    );

  return (
    <div
      className={`rounded-xl border transition-all ${
        isComplete ? 'border-green-500/20 bg-green-500/5' : 'border-white/8 bg-white/3 hover:bg-white/5'
      }`}
    >
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {isComplete ? <CheckCircle size={18} className="text-green-400 shrink-0" /> : <Circle size={18} className="text-gray-500 shrink-0" />}
        <span className={`flex-1 text-sm font-medium ${isComplete ? 'text-gray-400' : 'text-white'}`}>{item.title}</span>
        {item.duration_min != null && <span className="text-xs text-gray-600 shrink-0">{item.duration_min}m</span>}
        {speakerIcon}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              <p className="text-gray-400 text-xs mb-2">{item.description}</p>
              {actionSlot}
              {!isComplete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkComplete();
                  }}
                  className="text-xs text-green-400 hover:text-green-300 border border-green-400/20 rounded px-2 py-1 transition-colors mt-2"
                >
                  Mark complete
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
