/**
 * IVoiceEngine - Unified interface for Dual-Plane Architecture (Cloud vs Sovereign).
 * 
 * This is the "dumb terminal" contract. App.tsx only calls these methods.
 * The concrete engines handle all STT/LLM/TTS complexity and emit callbacks
 * for status, transcription, and agent responses.
 * 
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type SystemStatus = 'connected' | 'listening' | 'processing' | 'speaking' | 'error' | 'offline';

export interface IVoiceEngine {
  /** Begin capturing audio (PTT down). Must call onStatusChange('listening'). */
  startListening(): Promise<void>;

  /** Stop capturing audio (PTT up). Must call finalize logic and onStatusChange('processing'). */
  stopListening(): Promise<void>;

  /** Submit text directly (chat input or final transcription). Triggers LLM. */
  submitText(text: string): Promise<void>;

  /** Speak response using appropriate TTS (cloud or local Piper). */
  speak(text: string, overrideVoice?: string): Promise<void>;

  /** Callbacks set by App.tsx */
  onStatusChange?: (status: SystemStatus, detail?: string) => void;
  onTranscription?: (text: string, isFinal: boolean) => void;
  onAgentResponse?: (text: string) => void;
}

/** Helper to create engine based on lane */
export function createVoiceEngine(
  lane: 'cloud' | 'sovereign',
  callbacks: {
    onStatusChange?: (status: SystemStatus, detail?: string) => void;
    onTranscription?: (text: string, isFinal: boolean) => void;
    onAgentResponse?: (text: string) => void;
  }
): IVoiceEngine {
  if (lane === 'sovereign') {
    // Will be implemented in SovereignVoiceEngine.ts
    throw new Error('SovereignVoiceEngine not yet imported - see implementation');
  }
  throw new Error(`Unknown lane: ${lane}`);
}
