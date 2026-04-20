/**
 * BrowserVoiceEngine - Web Speech API implementation for browser mode.
 * Falls back to this when Tauri is not available.
 * 
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { IVoiceEngine, SystemStatus } from './VoiceEngine';

export class BrowserVoiceEngine implements IVoiceEngine {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  /** Accumulates all finalized segments across multiple onresult events. */
  private finalizedText = '';
  /** Latest interim (non-final) segment from the current recognition span. */
  private interimText = '';

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
  }

  private initRecognition(): SpeechRecognition | null {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('Web Speech API not supported in this browser');
      return null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('BrowserVoiceEngine: Speech recognition started');
      this.isListening = true;
      this.onStatusChange?.('listening', 'Browser speech recognition active');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Append confirmed text; clear interim since it's been finalized.
          this.finalizedText += result[0].transcript;
          this.interimText = '';
        } else {
          newInterim += result[0].transcript;
        }
      }

      if (newInterim) {
        this.interimText = newInterim;
      }

      // Emit combined text as interim so the UI shows live updates.
      const combined = (this.finalizedText + this.interimText).trim();
      if (combined) {
        this.onTranscription?.(combined, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('BrowserVoiceEngine error:', event.error);
      if (event.error === 'no-speech') {
        this.onStatusChange?.('connected', 'No speech detected');
      } else if (event.error === 'aborted') {
        // aborted = we stopped it deliberately; handled by stopListening
      } else {
        this.onStatusChange?.('error', `Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('BrowserVoiceEngine: Speech recognition ended');
      this.isListening = false;
      // If stopListening() already flushed the transcript, this is a no-op.
      // If recognition ended on its own (e.g. natural silence), flush here.
      const pending = (this.finalizedText + this.interimText).trim();
      if (pending) {
        this.finalizedText = '';
        this.interimText = '';
        this.onStatusChange?.('processing');
        this.onTranscription?.(pending, true);
      } else {
        this.onStatusChange?.('connected');
      }
    };

    return recognition;
  }

  async startListening(): Promise<void> {
    if (this.isListening || this.recognition) {
      console.warn('BrowserVoiceEngine: Already listening');
      return;
    }

    try {
      this.recognition = this.initRecognition();

      if (!this.recognition) {
        throw new Error('Web Speech API not supported');
      }

      this.finalizedText = '';
      this.interimText = '';
      this.recognition.start();
    } catch (err) {
      console.error('Failed to start browser voice recognition:', err);
      this.onStatusChange?.('error', 'Microphone access denied');
      throw err;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening || !this.recognition) {
      return;
    }

    this.isListening = false;

    try {
      this.recognition.stop();
    } catch (err) {
      console.error('Failed to stop browser voice recognition:', err);
    }
    this.recognition = null;

    // Flush any accumulated transcript as a final result (covers interim-only sessions
    // where the Web Speech API never fired a "final" result before PTT was released).
    // onend will see empty fields and skip its own flush.
    const pending = (this.finalizedText + this.interimText).trim();
    this.finalizedText = '';
    this.interimText = '';
    if (pending) {
      this.onStatusChange?.('processing');
      this.onTranscription?.(pending, true);
    } else {
      this.onStatusChange?.('connected');
    }
  }

  async submitText(_text: string): Promise<void> {
    // Browser mode doesn't need local LLM submission
    // This is handled by the main App.tsx flow
  }

  async speak(text: string, _overrideVoice?: string): Promise<void> {
    // Delegate to browser SpeechSynthesis (handled by VoiceboxClient)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      
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
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.finalizedText = '';
    this.interimText = '';
  }
}
