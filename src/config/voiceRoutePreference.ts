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

function writeVoiceRoute(route: VoiceRouteId, explicitSelection: boolean): void {
  localStorage.setItem(LS_KEY, route);
  if (explicitSelection) {
    localStorage.setItem(EXPLICIT_SELECTION_KEY, '1');
  }
}

export function hasExplicitVoiceRouteSelection(): boolean {
  try {
    return localStorage.getItem(EXPLICIT_SELECTION_KEY) === '1';
  } catch {
    return false;
  }
}

export function getVoiceRoute(): VoiceRouteId {
  try {
    const v = localStorage.getItem(LS_KEY);
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    const explicitSelection = hasExplicitVoiceRouteSelection();
    if (v === 'browser') return 'browser';
    // 'voicebox' requires the Tauri desktop app — silently promote to 'gemini' in browser mode.
    if (v === 'voicebox') {
      if (!isTauri) {
        writeVoiceRoute('gemini', explicitSelection);
        return 'gemini';
      }
      // Migrate legacy desktop installs that inherited Voicebox as an implicit default.
      if (!explicitSelection) {
        writeVoiceRoute('gemini', false);
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
    writeVoiceRoute(route, true);
  } catch {
    /* ignore */
  }
}

export function seedVoiceRoute(route: VoiceRouteId): void {
  try {
    writeVoiceRoute(route, false);
  } catch {
    /* ignore */
  }
}

export function voiceRouteLabel(route: VoiceRouteId): string {
  if (route === 'browser') return 'Browser Voice';
  if (route === 'voicebox') return 'Voice Box';
  return 'Gemini Voice';
}

// ── Supabase Sync ──────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabaseClient';

export async function syncVoiceRouteToSupabase(userId: string, route: VoiceRouteId): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('shell_preferences')
      .upsert({ user_id: userId, voice_route_id: route } as never, { onConflict: 'user_id' });
    if (error) console.warn('[voiceRoutePreference] sync failed:', error.message);
  } catch { /* offline */ }
}

export async function loadVoiceRouteFromSupabase(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('shell_preferences')
      .select('voice_route_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return;
    const row = data as { voice_route_id: string | null };
    const remote = row.voice_route_id;
    if (hasExplicitVoiceRouteSelection()) return;
    if (remote === 'voicebox' || remote === 'browser' || remote === 'gemini') {
      seedVoiceRoute(remote);
    }
  } catch { /* offline */ }
}
