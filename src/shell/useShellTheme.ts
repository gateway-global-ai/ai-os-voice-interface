// ─── Shell Theme Store ────────────────────────────────────────────────────────
// Persisted in localStorage. Controls background, overlay, and color scheme.

import { useState, useCallback } from 'react';
import type React from 'react';

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

const DEFAULTS: ShellTheme = {
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

function load(): ShellTheme {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) } as ShellTheme;
  } catch {
    return DEFAULTS;
  }
}

function save(theme: ShellTheme): void {
  localStorage.setItem(LS_KEY, JSON.stringify(theme));
}

export function useShellTheme() {
  const [theme, setThemeState] = useState<ShellTheme>(load);

  const setTheme = useCallback((patch: Partial<ShellTheme>) => {
    setThemeState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const resetTheme = useCallback(() => {
    save(DEFAULTS);
    setThemeState(DEFAULTS);
  }, []);

  return { theme, setTheme, resetTheme };
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
      '--panel-accent-bg':     'rgb(236,253,245)',
      '--panel-accent-border': 'rgba(52,211,153,0.65)',
      '--panel-accent-text':   'rgb(6,95,70)',
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
    '--panel-accent-bg':     'rgba(16,185,129,0.15)',
    '--panel-accent-border': 'rgba(52,211,153,0.4)',
    '--panel-accent-text':   'rgba(167,243,208,1)',
    '--panel-surface':       'rgba(255,255,255,0.05)',
    '--panel-surface-hover': 'rgba(255,255,255,0.09)',
    '--panel-heading':       'rgba(255,255,255,1)',
    '--panel-input-bg':      'rgba(255,255,255,0.08)',
    '--panel-input-border':  'rgba(255,255,255,0.18)',
  } as React.CSSProperties;
}
