import { invoke } from '@tauri-apps/api/core';

export interface VoiceProfile {
  id: string;
  name: string;
  sample_count?: number;
}

interface VoiceboxSynthConfig {
  base_url: string;
  profile_id: string | null;
}

// ─── Speak-state tracking (barge-in detection) ────────────────────────────

interface SpeakState {
  startTime: number;
  estimatedDurationMs: number;
  source: AudioBufferSourceNode;
}

export interface BargeInSignal {
  wasInterrupted: true;
  completionPct: number;   // 0.0–1.0 how far into the AI response the user cut in
  elapsedMs: number;
  /** high_dominance: user cut in near the end (efficient/D profile)
   *  low_context_ratio: user cut in early (AI was irrelevant/rambling) */
  discSignal: 'high_dominance' | 'low_context_ratio' | 'neutral';
}

let _speakState: SpeakState | null = null;

/**
 * Called at PTT-down. If the AI was speaking, stops it immediately and
 * returns a signal for telemetry scoring. Returns null if idle.
 */
export function checkAndClearBargein(): BargeInSignal | null {
  if (!_speakState) return null;

  const elapsed = performance.now() - _speakState.startTime;
  const completionPct = Math.min(1, elapsed / Math.max(1, _speakState.estimatedDurationMs));

  try { _speakState.source.stop(); } catch { /* already ended */ }
  _speakState = null;

  return {
    wasInterrupted: true,
    completionPct,
    elapsedMs: elapsed,
    discSignal:
      completionPct > 0.75 ? 'high_dominance'
      : completionPct < 0.35 ? 'low_context_ratio'
      : 'neutral',
  };
}

// ─── Module-level state ───────────────────────────────────────────────────

let _activeProfileId: string | null = null;
let _audioCtx: AudioContext | null = null;
let _vbReady: boolean | null = null;

function getAudioContext(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}

// ─── Voicebox API wrappers ────────────────────────────────────────────────

export async function ensureVoiceboxReady(): Promise<boolean> {
  if (_vbReady !== null) return _vbReady;
  try {
    _vbReady = await invoke<boolean>('ensure_voicebox_ready');
  } catch {
    _vbReady = false;
  }
  return _vbReady;
}

export async function listProfiles(): Promise<VoiceProfile[]> {
  return invoke<VoiceProfile[]>('list_voicebox_profiles');
}

export async function createProfile(name: string): Promise<VoiceProfile> {
  return invoke<VoiceProfile>('create_voicebox_profile', { name });
}

export async function addSample(profileId: string, wavData: number[], referenceText: string): Promise<void> {
  return invoke('add_voicebox_sample', { profileId, wavData, referenceText });
}

export async function setActiveProfile(profileId: string): Promise<void> {
  _activeProfileId = profileId;
  _vbReady = null;
  return invoke('set_active_voicebox_profile', { profileId });
}

export async function importProfileArchive(archivePath: string): Promise<VoiceProfile> {
  const profile = await invoke<VoiceProfile>('import_voicebox_profile_archive', { archivePath });
  _activeProfileId = profile.id;
  _vbReady = null;
  return profile;
}

export async function pickArchivePath(): Promise<string | null> {
  return invoke<string | null>('pick_voicebox_archive_path');
}

export function getActiveProfileId(): string | null {
  return _activeProfileId;
}

// ─── Speech synthesis ─────────────────────────────────────────────────────

export interface SpeakOptions {
  /**
   * When false, Voicebox failures (sidecar down, HTTP error, decode error) propagate
   * so callers can surface UI — no automatic browser `speechSynthesis` fallback.
   * Default true (backward compatible for shell / chat).
   */
  allowBrowserFallback?: boolean;
  /** Skip Voicebox entirely and use browser `speechSynthesis` (operator preference). */
  forceBrowserOnly?: boolean;
}

export interface SynthesizedAudioResult {
  objectUrl: string;
  contentType: string;
}

/** Immediately stop any audio currently playing. Safe to call when nothing is playing. */
export function stop(): void {
  if (_speakState) {
    try { _speakState.source.stop(); } catch { /* already ended */ }
    _speakState = null;
  }
  // Also cancel browser TTS fallback if it's running
  try { speechSynthesis.cancel(); } catch { /* not available */ }
}

async function requestVoiceboxAudio(text: string, profileId?: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const ready = await ensureVoiceboxReady();
  if (!ready) throw new Error('Voicebox sidecar not ready');

  const config = await invoke<VoiceboxSynthConfig>('synthesize_speech', {
    text,
    profileId: profileId ?? _activeProfileId ?? null,
  });

  const response = await fetch(`${config.base_url}/generate/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      ...(config.profile_id ? { profile_id: config.profile_id } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Voicebox /generate/stream returned ${response.status}`);
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get('content-type') || 'audio/wav',
  };
}

export async function synthesizeToObjectUrl(text: string, profileId?: string): Promise<SynthesizedAudioResult> {
  const { bytes, contentType } = await requestVoiceboxAudio(text, profileId);
  const blob = new Blob([bytes], { type: contentType });
  return {
    objectUrl: URL.createObjectURL(blob),
    contentType,
  };
}

export async function speak(text: string, profileId?: string, options?: SpeakOptions): Promise<void> {
  const allowBrowserFallback = options?.allowBrowserFallback !== false;

  stop();

  if (options?.forceBrowserOnly) {
    return browserTtsFallback(text);
  }

  try {
    const { bytes } = await requestVoiceboxAudio(text, profileId);
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const decoded = await ctx.decodeAudioData(bytes);
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);

    _speakState = {
      startTime: performance.now(),
      estimatedDurationMs: decoded.duration * 1000,
      source,
    };

    source.start(0);
    return new Promise<void>((resolve) => {
      source.onended = () => {
        _speakState = null;
        resolve();
      };
    });
  } catch (err) {
    console.warn('[VoiceboxClient] Speech synthesis failed:', err);
    if (!allowBrowserFallback) {
      throw err instanceof Error ? err : new Error(String(err));
    }
    console.warn('[VoiceboxClient] Falling back to browser TTS');
    return browserTtsFallback(text);
  }
}

function browserTtsFallback(text: string): Promise<void> {
  return new Promise((resolve) => {
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0;
    utt.pitch = 1.0;
    const voices = speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /Microsoft.*Online.*Natural/i.test(v.name)) ??
      voices.find((v) => /Natural|Neural/i.test(v.name)) ??
      voices.find((v) => /Microsoft/i.test(v.name));
    if (preferred) utt.voice = preferred;
    utt.onend = () => resolve();
    speechSynthesis.speak(utt);
  });
}

// ─── WAV encoding (for voice sample uploads) ─────────────────────────────

/**
 * Encode a Float32 PCM buffer (default 16kHz mono) to a WAV byte array
 * for uploading as a Voicebox voice sample.
 */
export function encodeWav(pcm: Float32Array, sampleRate = 16000): number[] {
  const numSamples = pcm.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  }

  return Array.from(new Uint8Array(buffer));
}
