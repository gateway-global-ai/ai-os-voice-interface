/**
 * SovereignVoiceEngine - Fully local air-gapped STT/LLM/TTS using Rust Kernel.
 * 
 * Uses Web Audio API to capture raw 16kHz Float32 PCM (no WebM/Opus trap).
 * Sends clean PCM frames to Rust via Tauri for whisper-rs inference.
 * 
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { IVoiceEngine, SystemStatus } from './VoiceEngine';
import { pcmCaptureWorkletCode } from './audio-processor.worklet';

/** True only when running inside the Tauri desktop shell. */
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export class SovereignVoiceEngine implements IVoiceEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private isListening = false;
  private pcmBuffer: Float32Array[] = [];
  private sendInFlight = false;
  private sampleRate = 16000;
  private chunkDurationMs = 800;
  private samplesPerChunk = 0;
  private modelsReady = false;
  private modelInitPromise: Promise<void> | null = null;
  private workletLoaded = false;

  private unlistenInterim: (() => void) | null = null;
  private unlistenFinal: (() => void) | null = null;
  onStatusChange?: (status: SystemStatus, detail?: string) => void;
  onTranscription?: (text: string, isFinal: boolean) => void;
  onAgentResponse?: (text: string) => void;

  constructor(
    onStatusChange?: (status: SystemStatus, detail?: string) => void,
    onTranscription?: (text: string, isFinal: boolean) => void,
    onAgentResponse?: (text: string) => void
  ) {
    this.onStatusChange = onStatusChange;
    this.onTranscription = onTranscription;
    this.onAgentResponse = onAgentResponse;
    this.samplesPerChunk = Math.floor((this.sampleRate * this.chunkDurationMs) / 1000);
    if (isTauri) {
      this.setupTauriListeners();
    }
  }

  private setupTauriListeners() {
    // Listen for real transcription events from Rust whisper-rs
    const INTERRUPT_REGEX = /\b(cancel|stop|nevermind|abort|never mind)\b/i;

    listen<string>('interim_transcription', (event) => {
      const text = event.payload.trim();
      
      // Deterministic Early-Exit: Check for interrupt keywords before passing to UI/LLM
      if (INTERRUPT_REGEX.test(text)) {
        console.log('SovereignVoiceEngine: Interrupt keyword detected - aborting intent');
        this.stopListening().then(() => {
          invoke('abort_transcription', {}).catch(console.error);
          this.onStatusChange?.('connected', 'Intent aborted');
        });
        return; // Do NOT call onTranscription - prevents LLM wakeup
      }

      this.onTranscription?.(text, false);
    }).then(unlisten => {
      this.unlistenInterim = unlisten;
    });

    listen<string>('final_transcription', (event) => {
      this.onTranscription?.(event.payload, true);
      this.onStatusChange?.('processing');
      // The App.tsx will call submitText on final transcription via existing flow
    }).then(unlisten => {
      this.unlistenFinal = unlisten;
    });

    // Also listen for abort acknowledgment from kernel
    listen<string>('abort_acknowledged', (event) => {
      console.log('SovereignVoiceEngine:', event.payload);
      this.onStatusChange?.('connected');
    }).then(_unlisten => {
      // We don't store this unlisten for simplicity
    });
  }

  private async ensureModelsReady() {
    if (this.modelsReady) return;

    if (!isTauri) {
      // Running in browser dev mode — skip Tauri model init
      this.modelsReady = true;
      return;
    }

    if (!this.modelInitPromise) {
      this.onStatusChange?.('processing', 'Preparing local STT model...');
      this.modelInitPromise = invoke<{ ready: boolean; downloaded: boolean; model_path: string }>(
        'init_models',
        {},
      )
        .then((result) => {
          this.modelsReady = result.ready;
          console.log(
            `SovereignVoiceEngine: Whisper model ready at ${result.model_path} (downloaded=${result.downloaded})`,
          );
        })
        .catch((error) => {
          this.modelInitPromise = null;
          throw error;
        });
    }

    await this.modelInitPromise;
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;

    try {
      await this.ensureModelsReady();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: this.sampleRate
        } 
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      });

      // Load AudioWorklet module (modern replacement for ScriptProcessorNode)
      if (!this.workletLoaded) {
        try {
          // Create a blob URL from the worklet code
          const blob = new Blob([pcmCaptureWorkletCode], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          
          await this.audioContext.audioWorklet.addModule(workletUrl);
          this.workletLoaded = true;
          
          // Clean up the blob URL after loading
          URL.revokeObjectURL(workletUrl);
        } catch (err) {
          console.warn('AudioWorklet not supported, falling back to ScriptProcessorNode:', err);
          // Fallback for older browsers
          await this.startListeningLegacy();
          return;
        }
      }

      this.mediaSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // AudioWorkletNode for raw PCM capture (modern, performant approach)
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor');
      
      this.audioWorkletNode.port.onmessage = (event) => {
        if (!this.isListening) return;
        
        if (event.data.type === 'pcm-data') {
          const inputData = event.data.data as Float32Array;
          const copy = new Float32Array(inputData); // Copy to avoid mutation
          this.pcmBuffer.push(copy);

          // Send chunk when we have enough samples (~800ms); skip if a send is already in flight
          const totalSamples = this.pcmBuffer.reduce((sum, arr) => sum + arr.length, 0);
          if (totalSamples >= this.samplesPerChunk && !this.sendInFlight) {
            void this.sendPcmChunk();
          }
        }
      };

      this.mediaSource.connect(this.audioWorkletNode);
      this.audioWorkletNode.connect(this.audioContext.destination); // Required for some browsers

      this.isListening = true;
      this.pcmBuffer = [];
      this.onStatusChange?.('listening', 'Raw PCM capture active (16kHz mono)');
      
      console.log('SovereignVoiceEngine: Microphone hijacked with raw PCM pipeline (AudioWorklet)');
    } catch (err) {
      console.error('Failed to start sovereign listening:', err);
      this.onStatusChange?.('error', 'Microphone access denied');
      throw err;
    }
  }

  /** Legacy fallback for browsers that don't support AudioWorklet */
  private async startListeningLegacy(): Promise<void> {
    if (this.isListening) return;

    try {
      this.mediaSource = this.audioContext!.createMediaStreamSource(this.mediaStream!);
      
      // ScriptProcessorNode fallback (deprecated but still functional)
      const scriptProcessor = this.audioContext!.createScriptProcessor(4096, 1, 1);
      
      scriptProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isListening) return;
        
        const inputData = e.inputBuffer.getChannelData(0); // Mono channel
        const copy = new Float32Array(inputData); // Copy to avoid mutation
        this.pcmBuffer.push(copy);

        // Send chunk when we have enough samples (~800ms); skip if a send is already in flight
        const totalSamples = this.pcmBuffer.reduce((sum, arr) => sum + arr.length, 0);
        if (totalSamples >= this.samplesPerChunk && !this.sendInFlight) {
          void this.sendPcmChunk();
        }
      };

      this.mediaSource.connect(scriptProcessor);
      scriptProcessor.connect(this.audioContext!.destination); // Required for some browsers

      this.isListening = true;
      this.pcmBuffer = [];
      this.onStatusChange?.('listening', 'Raw PCM capture active (16kHz mono, legacy mode)');
      
      console.log('SovereignVoiceEngine: Microphone hijacked with raw PCM pipeline (ScriptProcessorNode fallback)');
    } catch (err) {
      console.error('Failed to start legacy listening:', err);
      this.onStatusChange?.('error', 'Microphone access denied');
      throw err;
    }
  }

  private async sendPcmChunk() {
    if (this.pcmBuffer.length === 0 || !isTauri) return;
    this.sendInFlight = true;

    // Flatten all accumulated Float32Arrays into one
    const totalLength = this.pcmBuffer.reduce((sum, arr) => sum + arr.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.pcmBuffer) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    this.pcmBuffer = [];

    try {
      await invoke('transcribe_audio_chunk', { 
        pcmData: Array.from(combined) 
      });
    } catch (err) {
      console.error('Failed to send PCM chunk to Rust:', err);
    } finally {
      this.sendInFlight = false;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    this.isListening = false;

    // Send any remaining audio
    if (this.pcmBuffer.length > 0) {
      await this.sendPcmChunk();
    }

    // Cleanup Web Audio nodes
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode.port.close();
      this.audioWorkletNode = null;
    }
    if (this.mediaSource) {
      this.mediaSource.disconnect();
      this.mediaSource = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // Release microphone
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Tell Rust to run final inference (Tauri only)
    if (isTauri) {
      try {
        await invoke('finalize_transcription', {});
      } catch (err) {
        console.error('Finalize transcription failed:', err);
      }
    }

    this.onStatusChange?.('processing', 'Finalizing local Whisper transcription...');
    console.log('SovereignVoiceEngine: Microphone released. Raw PCM pipeline stopped.');
  }

  async submitText(text: string): Promise<void> {
    if (!text?.trim()) return;
    
    this.onStatusChange?.('processing');
    
    if (!isTauri) {
      this.onStatusChange?.('error', 'Local kernel unavailable in browser mode');
      return;
    }

    try {
      // Forward to Rust kernel (existing execute_blind_action for Ollama)
      await invoke('execute_blind_action', { intentText: text });
      // LLM streaming tokens are handled by the listener in App.tsx
    } catch (err) {
      console.error('Sovereign submitText failed:', err);
      this.onStatusChange?.('error', 'Local kernel error');
    }
  }

  async speak(text: string, overrideVoice?: string): Promise<void> {
    // Delegate to browser SpeechSynthesis for MVP (Piper can be added in Rust later)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v => 
        (overrideVoice && v.name.toLowerCase().includes(overrideVoice.toLowerCase())) ||
        v.name.includes('Microsoft') || v.name.includes('David')
      );
      if (preferred) utterance.voice = preferred;

      this.onStatusChange?.('speaking');
      speechSynthesis.speak(utterance);

      utterance.onend = () => {
        this.onStatusChange?.('connected');
      };
    } else {
      this.onStatusChange?.('connected');
    }
  }

  cleanup() {
    this.stopListening();
    if (this.unlistenInterim) this.unlistenInterim();
    if (this.unlistenFinal) this.unlistenFinal();
  }
}
