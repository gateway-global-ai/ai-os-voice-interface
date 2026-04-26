/**
 * Initial shell surface mode: session persistence > URL > legacy storage hints.
 * Bootstrap/debug flags are lowest precedence after explicit session mode (POL-SHELL-006).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import {
  persistDiagnosticsChromeFlagsFromUrl,
  readLegacyStorageDiagnosticsHint,
} from './shellChromeVisibility';
import { clampSurfaceModeToInterimAuthority, readInterimShellAuthority } from './shellAuthority';
import {
  type ShellSurfaceMode,
  SHELL_SURFACE_MODE_STORAGE_KEY,
  isShellSurfaceMode,
} from './shellSurfaceMode';

export function readPersistedSurfaceMode(): ShellSurfaceMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(SHELL_SURFACE_MODE_STORAGE_KEY);
    if (isShellSurfaceMode(v)) return v;
  } catch {
    /* */
  }
  return null;
}

export function writePersistedSurfaceMode(mode: ShellSurfaceMode): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SHELL_SURFACE_MODE_STORAGE_KEY, mode);
  } catch {
    /* */
  }
}

/**
 * Precedence: (1) session `aios.shell.surfaceMode` (2) URL `aios_operator` / `aios_dev`
 * (3) persist URL → legacy keys, then legacy storage-only hint → operator
 * (4) primary.
 * Then **interim authority clamp**: elevated modes without device-local elevation fall back to primary.
 */
function resolveInitialSurfaceModeUncapped(): ShellSurfaceMode {
  if (typeof window === 'undefined') return 'primary';
  const persisted = readPersistedSurfaceMode();
  if (persisted) return persisted;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('aios_operator') === '1') return 'operator';
    if (q.get('aios_dev') === '1') return 'developer';
  } catch {
    /* */
  }
  persistDiagnosticsChromeFlagsFromUrl();
  if (readLegacyStorageDiagnosticsHint()) return 'operator';
  return 'primary';
}

export function resolveInitialSurfaceMode(): ShellSurfaceMode {
  const raw = resolveInitialSurfaceModeUncapped();
  const auth = readInterimShellAuthority();
  return clampSurfaceModeToInterimAuthority(raw, auth);
}

// ── Supabase Session Tracking ──────────────────────────────────────────────────
// Creates / updates a shell_sessions row so the admin panel can see active sessions.

import { aiOsSupabase } from '../lib/supabaseClient';

const SS_SESSION_ID_KEY = 'aios_supabase_session_id';

function readSessionId(): string | null {
  try { return sessionStorage.getItem(SS_SESSION_ID_KEY); } catch { return null; }
}

function writeSessionId(id: string): void {
  try { sessionStorage.setItem(SS_SESSION_ID_KEY, id); } catch { /* ignore */ }
}

export function getTrackedShellSessionId(): string | null {
  return readSessionId();
}

/** Call on app mount: upserts/creates a shell session row in Supabase. */
export async function trackShellSession(
  surfaceMode: ShellSurfaceMode,
  userId: string | null,
  entryMode: 'new' | 'returning',
): Promise<string | null> {
  if (!aiOsSupabase) return null;
  try {
    const existing = readSessionId();
    if (existing) {
      await aiOsSupabase
        .from('shell_sessions')
        .update({
          last_active_at: new Date().toISOString(),
          surface_mode: surfaceMode,
          user_id: userId ?? null,
          entry_mode: entryMode,
        } as never)
        .eq('id', existing);
      return existing;
    }
    const token = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const { data, error } = await aiOsSupabase
      .from('shell_sessions')
      .insert({ user_id: userId ?? null, session_token: token, entry_mode: entryMode, surface_mode: surfaceMode } as never)
      .select('id')
      .single();
    if (!error && data) {
      const id = (data as { id: string }).id;
      writeSessionId(id);
      return id;
    }
  } catch { /* offline */ }
  return null;
}
