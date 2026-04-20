/**
 * TTS output path: Gemini 2.5 (default) | local Voicebox | browser SpeechSynthesis.
 * Read synchronously inside speak() so callbacks stay dependency-light.
 *
 * VoiceRouteId governed values: 'voicebox' | 'browser' | 'gemini'
 * See AIOS-VOICE-TTS-ARCHITECTURE-STANDARD-001 for the full contract.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

const LS_KEY = 'aios_voice_route';
const EXPLICIT_SELECTION_KEY = 'aios_voice_route_explicit';

/** Governed TTS route values — do not add values without updating the architecture standard. */
export type VoiceRouteId = 'voicebox' | 'browser' | 'gemini';

export function getVoiceRoute(): VoiceRouteId {
  try {
    const v = localStorage.getItem(LS_KEY);
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    const explicitSelection = localStorage.getItem(EXPLICIT_SELECTION_KEY) === '1';
    if (v === 'browser') return 'browser';
    // 'voicebox' requires the Tauri desktop app — silently promote to 'gemini' in browser mode.
    if (v === 'voicebox') {
      if (!isTauri) {
        localStorage.setItem(LS_KEY, 'gemini');
        return 'gemini';
      }
      // Migrate legacy desktop installs that inherited Voicebox as an implicit default.
      if (!explicitSelection) {
        localStorage.setItem(LS_KEY, 'gemini');
        return 'gemini';
      }
      return 'voicebox';
    }
    if (v === 'gemini') return 'gemini';
    return 'gemini';
  } catch {
    return 'gemini';
  }
}

export function setVoiceRoute(route: VoiceRouteId): void {
  try {
    localStorage.setItem(LS_KEY, route);
    localStorage.setItem(EXPLICIT_SELECTION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function voiceRouteLabel(route: VoiceRouteId): string {
  if (route === 'browser') return 'Browser Voice';
  if (route === 'voicebox') return 'Voice Box';
  return 'Gemini Voice';
}
