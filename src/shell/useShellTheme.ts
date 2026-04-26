// ─── Shell Theme Store ────────────────────────────────────────────────────────
// Persisted in localStorage. Controls background, overlay, and color scheme.
// Supabase sync: theme tokens stored in shell_preferences.theme_tokens JSONB.

import { useCallback } from 'react';
import type React from 'react';
import { supabase } from '../lib/supabaseClient';
import { useSupabaseSync } from '../lib/useSupabaseSync';

const LS_KEY = 'aios_shell_theme';

/** 'canvas' = animated catalog effect | 'custom' = user image/video | 'dark' = solid */
export type BackgroundType = 'canvas' | 'custom' | 'dark';

export interface ShellTheme {
  backgroundType: BackgroundType;
  /** Active shadcn.io catalog effect ID (used when backgroundType === 'canvas'). */
  canvasBackgroundId: string;
  customBgPath: string | null;
  customBgKind: 'image' | 'video' | null;
  overlayColor: string;
  overlayOpacity: number;
  colorScheme: 'dark' | 'light';
  overlayWidthPercent: number;
  overlayMinWidth: number;
  overlayMaxWidth: number;
  overlayPadding: number;
  overlayCardPadding: number;
  overlayGap: number;
}

export const SHELL_THEME_DEFAULTS: ShellTheme = {
  backgroundType: 'canvas',
  canvasBackgroundId: 'starfield',
  customBgPath: null,
  customBgKind: null,
  overlayColor: '#020617',
  overlayOpacity: 0.72,
  colorScheme: 'dark',
  overlayWidthPercent: 95,
  overlayMinWidth: 320,
  overlayMaxWidth: 1440,
  overlayPadding: 16,
  overlayCardPadding: 24,
  overlayGap: 20,
};

function save(theme: ShellTheme): void {
  localStorage.setItem(LS_KEY, JSON.stringify(theme));
}

export function useShellTheme(userId?: string | null) {
  const [theme, setThemeState, syncing] = useSupabaseSync<ShellTheme>({
    lsKey: LS_KEY,
    table: 'shell_preferences',
    userId,
    defaults: SHELL_THEME_DEFAULTS,
    mergePolicy: 'local-over-remote',
    fromRow: (row) => {
      const remote = row.theme_tokens;
      if (!remote || typeof remote !== 'object') return {};
      return remote as Partial<ShellTheme>;
    },
    toRow: (state, resolvedUserId) => ({
      user_id: resolvedUserId,
      theme_tokens: state as unknown as Record<string, unknown>,
    }),
  });

  const setTheme = useCallback((patch: Partial<ShellTheme>) => {
    setThemeState(patch);
  }, [setThemeState]);

  const resetTheme = useCallback(() => {
    save(SHELL_THEME_DEFAULTS);
    setThemeState(SHELL_THEME_DEFAULTS);
  }, [setThemeState]);

  return { theme, setTheme, resetTheme, syncing };
}

// ── Supabase Sync helpers (call with userId after OTP) ─────────────────────

export async function syncThemeToSupabase(userId: string, theme: ShellTheme): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('shell_preferences')
      .upsert(
        { user_id: userId, theme_tokens: theme as unknown as Record<string, unknown> } as never,
        { onConflict: 'user_id' },
      );
    if (error) console.warn('[useShellTheme] syncThemeToSupabase failed:', error.message);
  } catch { /* offline */ }
}

export async function loadThemeFromSupabase(userId: string): Promise<ShellTheme | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('shell_preferences')
      .select('theme_tokens')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as { theme_tokens: Partial<ShellTheme> | null };
    if (!row.theme_tokens) return null;
    return { ...SHELL_THEME_DEFAULTS, ...row.theme_tokens };
  } catch {
    return null;
  }
}

// ─── State → CSS Variable projection ─────────────────────────────────────────
// Single source of truth. Called once on the root div.
// Every component inherits passively via var(--panel-*). No prop threading.

export function themeToCssVars(theme: ShellTheme): React.CSSProperties {
  const layoutVars = {
    '--shell-overlay-width': `${theme.overlayWidthPercent}vw`,
    '--shell-overlay-min-width': `${theme.overlayMinWidth}px`,
    '--shell-overlay-max-width': `${theme.overlayMaxWidth}px`,
    '--shell-overlay-padding': `${theme.overlayPadding}px`,
    '--shell-overlay-card-padding': `${theme.overlayCardPadding}px`,
    '--shell-overlay-gap': `${theme.overlayGap}px`,
  } as React.CSSProperties;

  if (theme.colorScheme === 'light') {
    return {
      ...layoutVars,
      '--panel-bg':            'rgba(255,255,255,0.88)',
      '--panel-bg-hover':      'rgba(245,245,245,0.96)',
      '--panel-border':        'rgba(0,0,0,0.09)',
      '--panel-text':          'rgb(24,24,27)',
      '--panel-text-muted':    'rgb(113,113,122)',
      '--panel-accent-bg':     'rgb(239,246,255)',
      '--panel-accent-border': 'rgba(59,130,246,0.65)',
      '--panel-accent-text':   'rgb(30,64,175)',
      '--panel-surface':       'rgba(0,0,0,0.03)',
      '--panel-surface-hover': 'rgba(0,0,0,0.06)',
      '--panel-heading':       'rgb(9,9,11)',
      '--panel-input-bg':      'rgba(0,0,0,0.04)',
      '--panel-input-border':  'rgba(0,0,0,0.12)',
    } as React.CSSProperties;
  }
  // dark defaults — :root already defines these, explicit here for completeness
  return {
    ...layoutVars,
    '--panel-bg':            'rgba(255,255,255,0.07)',
    '--panel-bg-hover':      'rgba(255,255,255,0.12)',
    '--panel-border':        'rgba(255,255,255,0.15)',
    '--panel-text':          'rgba(255,255,255,0.92)',
    '--panel-text-muted':    'rgba(255,255,255,0.45)',
    '--panel-accent-bg':     'rgba(59,130,246,0.16)',
    '--panel-accent-border': 'rgba(96,165,250,0.58)',
    '--panel-accent-text':   'rgba(191,219,254,1)',
    '--panel-surface':       'rgba(255,255,255,0.05)',
    '--panel-surface-hover': 'rgba(255,255,255,0.09)',
    '--panel-heading':       'rgba(255,255,255,1)',
    '--panel-input-bg':      'rgba(255,255,255,0.08)',
    '--panel-input-border':  'rgba(255,255,255,0.18)',
  } as React.CSSProperties;
}
