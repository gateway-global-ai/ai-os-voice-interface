/**
 * GeminiVoiceEngine — Gemini 2.5 TTS implementation.
 *
 * Uses the same-origin Gemini gateway so the browser never handles the
 * long-lived Gemini API key directly.
 * Falls back to browser SpeechSynthesis if the gateway is unavailable
 * or the request fails, ensuring voice output is always available.
 *
 * Governed by: AIOS-VOICE-TTS-ARCHITECTURE-STANDARD-001
 * Route ID: 'gemini' (see voiceRoutePreference.ts)
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { geminiSynthesizeSpeech, streamGeminiSpeech } from '../../api/geminiGateway';
import type { IVoiceEngine, SystemStatus } from './VoiceEngine';

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_VOICE = 'Kore'; // Gemini built-in voice name
const GEMINI_PCM_SAMPLE_RATE = 24000;

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export type GeminiPlaybackResult =
  | { requestedRoute: 'gemini'; actualRoute: 'gemini'; reason: 'gemini_success' }
  | {
      requestedRoute: 'gemini';
      actualRoute: 'browser_fallback';
      reason: 'gateway_unavailable' | 'gemini_request_failed' | 'gemini_decode_failed';
      detail?: string;
    };

// ─── Audio playback helpers ───────────────────────────────────────────────────

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function playAudioBuffer(
  audioCtx: AudioContext,
  arrayBuffer: ArrayBuffer,
): Promise<void> {
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  return new Promise((resolve) => {
    source.onended = () => resolve();
    source.start(0);
  });
}

async function playPcm16Mono(
  audioCtx: AudioContext,
  arrayBuffer: ArrayBuffer,
  sampleRate = GEMINI_PCM_SAMPLE_RATE,
): Promise<void> {
  const pcm = new Int16Array(arrayBuffer);
  const audioBuffer = audioCtx.createBuffer(1, pcm.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < pcm.length; i++) {
    channelData[i] = pcm[i] / 0x8000;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  return new Promise((resolve) => {
    source.onended = () => resolve();
    source.start(0);
  });
}

function isGeminiLinearPcm(mimeType?: string): boolean {
  if (!mimeType) return true;
  const normalized = mimeType.toLowerCase();
  return (
    normalized.includes('audio/l16') ||
    normalized.includes('linear16') ||
    normalized.includes('audio/pcm') ||
    normalized.includes('codec=pcm')
  );
}

function browserTtsFallback(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const pick =
    voices.find((v) => /Microsoft.*Online.*Natural/i.test(v.name)) ??
    voices.find((v) => /Natural|Neural/i.test(v.name)) ??
    voices.find((v) => /Microsoft/i.test(v.name) && v.lang.startsWith('en'));
  if (pick) utt.voice = pick;
  window.speechSynthesis.speak(utt);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class GeminiVoiceEngine implements IVoiceEngine {
  private recognition: BrowserSpeechRecognition | null = null;
  private isListeningFlag = false;
  private transcript = '';
  private audioCtx: AudioContext | null = null;
  private streamAbortController: AbortController | null = null;
  private playbackQueue: Promise<void> = Promise.resolve();
  private nextChunkStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private playbackDrainResolver: (() => void) | null = null;

  onStatusChange?: (status: SystemStatus, detail?: string) => void;
  onTranscription?: (text: string, isFinal: boolean) => void;
  onAgentResponse?: (text: string) => void;
  onPlaybackResult?: (result: GeminiPlaybackResult) => void;

  constructor(
    onStatusChange?: (status: SystemStatus, detail?: string) => void,
    onTranscription?: (text: string, isFinal: boolean) => void,
    onAgentResponse?: (text: string) => void,
    onPlaybackResult?: (result: GeminiPlaybackResult) => void,
  ) {
    this.onStatusChange = onStatusChange;
    this.onTranscription = onTranscription;
    this.onAgentResponse = onAgentResponse;
    this.onPlaybackResult = onPlaybackResult;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private async stopActivePlayback(): Promise<void> {
    this.streamAbortController?.abort();
    this.streamAbortController = null;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.playbackQueue = Promise.resolve();
    this.resolvePlaybackDrain();
    this.clearScheduledPlayback();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        await this.audioCtx.close();
      } catch {
        // ignore - best effort cancellation
      } finally {
        this.audioCtx = null;
      }
    }
  }

  private resolvePlaybackDrain(): void {
    const resolve = this.playbackDrainResolver;
    this.playbackDrainResolver = null;
    resolve?.();
  }

  private clearScheduledPlayback(): void {
    const sources = Array.from(this.activeSources);
    this.activeSources.clear();
    this.nextChunkStartTime = 0;
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        // ignore - best effort cancellation
      }
    }
  }

  private waitForPlaybackDrain(): Promise<void> {
    if (this.activeSources.size === 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.playbackDrainResolver = resolve;
    });
  }

  private async scheduleAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
    const audioCtx = this.getAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    const startTime = Math.max(audioCtx.currentTime + 0.01, this.nextChunkStartTime);
    this.nextChunkStartTime = startTime + audioBuffer.duration;
    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.resolvePlaybackDrain();
      }
    };
    source.start(startTime);
  }

  private async playStreamChunk(data: string, mimeType?: string): Promise<void> {
    const arrayBuffer = base64ToArrayBuffer(data);
    if (isGeminiLinearPcm(mimeType)) {
      const pcm = new Int16Array(arrayBuffer);
      const audioBuffer = this.getAudioContext().createBuffer(1, pcm.length, GEMINI_PCM_SAMPLE_RATE);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) {
        channelData[i] = pcm[i] / 0x8000;
      }
      await this.scheduleAudioBuffer(audioBuffer);
      return;
    }

    const decoded = await this.getAudioContext().decodeAudioData(arrayBuffer.slice(0));
    await this.scheduleAudioBuffer(decoded);
  }

  async startListening(): Promise<void> {
    if (this.isListeningFlag) return;

    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: BrowserSpeechRecognitionConstructor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      this.onStatusChange?.('error', 'Speech recognition not supported in this browser');
      return;
    }

    this.transcript = '';
    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    this.recognition = rec;
    this.isListeningFlag = true;

    rec.onresult = (e: BrowserSpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          this.transcript += result[0]!.transcript;
        } else {
          interim += result[0]!.transcript;
        }
      }
      this.onTranscription?.(this.transcript + interim, false);
    };

    rec.onerror = () => {
      this.isListeningFlag = false;
      this.onStatusChange?.('error', 'Speech recognition error');
    };

    rec.start();
    this.onStatusChange?.('listening');
  }

  async stopListening(): Promise<void> {
    if (!this.isListeningFlag) return;
    this.isListeningFlag = false;
    try { this.recognition?.stop(); } catch { /* noop */ }
    this.onStatusChange?.('processing');
    if (this.transcript.trim()) {
      this.onTranscription?.(this.transcript.trim(), true);
    }
  }

  async submitText(text: string): Promise<void> {
    if (!text.trim()) return;
    this.onTranscription?.(text.trim(), true);
  }

  async speak(text: string, overrideVoice?: string): Promise<void> {
    if (!text.trim()) return;

    await this.stopActivePlayback();
    this.onStatusChange?.('speaking');

    try {
      const voiceName = overrideVoice ?? DEFAULT_VOICE;
      this.streamAbortController = new AbortController();
      this.nextChunkStartTime = 0;
      let receivedAudio = false;
      let streamReportedDone = false;

      try {
        await streamGeminiSpeech(
          { text, voiceName },
          {
            onChunk: async (chunk) => {
              if (chunk.type === 'audio') {
                receivedAudio = true;
                this.playbackQueue = this.playbackQueue.then(() =>
                  this.playStreamChunk(chunk.data, chunk.mimeType),
                );
                return;
              }
              if (chunk.type === 'error') {
                throw new Error(chunk.error);
              }
              if (chunk.type === 'done') {
                streamReportedDone = true;
              }
            },
          },
          this.streamAbortController.signal,
        );
        await this.playbackQueue;
        await this.waitForPlaybackDrain();
      } catch (streamError) {
        if (streamError instanceof DOMException && streamError.name === 'AbortError') {
          this.onStatusChange?.('connected');
          return;
        }

        console.warn('[GeminiVoiceEngine] Streaming TTS failed, falling back to one-shot gateway TTS:', streamError);
        this.clearScheduledPlayback();
        this.playbackQueue = Promise.resolve();
        this.nextChunkStartTime = 0;

        const response = await geminiSynthesizeSpeech({ text, voiceName });
        const arrayBuffer = base64ToArrayBuffer(response.audioData);
        const audioCtx = this.getAudioContext();
        if (isGeminiLinearPcm(response.mimeType)) {
          await playPcm16Mono(audioCtx, arrayBuffer);
        } else {
          await playAudioBuffer(audioCtx, arrayBuffer);
        }
        receivedAudio = true;
      } finally {
        this.streamAbortController = null;
      }

      if (!receivedAudio && streamReportedDone) {
        throw new Error('Gemini stream ended without audio');
      }

      this.onPlaybackResult?.({
        requestedRoute: 'gemini',
        actualRoute: 'gemini',
        reason: 'gemini_success',
      });
    } catch (err) {
      console.warn('[GeminiVoiceEngine] Gateway TTS failed, falling back to browser TTS:', err);
      this.onPlaybackResult?.({
        requestedRoute: 'gemini',
        actualRoute: 'browser_fallback',
        reason:
          err instanceof TypeError
            ? 'gateway_unavailable'
            : err instanceof DOMException
              ? 'gemini_decode_failed'
              : 'gemini_request_failed',
        detail: err instanceof Error ? err.message : String(err),
      });
      browserTtsFallback(text);
    }

    this.onStatusChange?.('connected');
  }

  async stop(): Promise<void> {
    await this.stopActivePlayback();
  }

  cleanup() {
    void this.stopActivePlayback();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.isListeningFlag = false;
    this.transcript = '';
  }
}
