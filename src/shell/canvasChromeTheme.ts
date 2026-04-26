import type { CanvasChromeSettings } from '../lib/canvasChromeSettings';
import { SHELL_THEME_DEFAULTS, type ShellTheme } from './useShellTheme';

export function mapThemeToCanvasChrome(theme: ShellTheme): CanvasChromeSettings {
  return {
    bgOverlayColor: theme.overlayColor,
    bgOverlayOpacity: theme.overlayOpacity,
    cardBackgroundColor: '#ffffff',
    cardOpacity: 0.78,
    cardBorderOpacity: 0.55,
    cardBlurPx: 24,
    primaryTextColor: theme.colorScheme === 'light' ? '#0f172a' : '#f8fafc',
    mutedTextColor: theme.colorScheme === 'light' ? '#475569' : '#94a3b8',
  };
}

export function isThemeOverlayCustomized(theme: ShellTheme): boolean {
  return (
    theme.overlayColor !== SHELL_THEME_DEFAULTS.overlayColor
    || theme.overlayOpacity !== SHELL_THEME_DEFAULTS.overlayOpacity
  );
}
