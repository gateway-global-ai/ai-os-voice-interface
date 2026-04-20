/**
 * ShellBackground — full-bleed layer behind the entire shell.
 * canvas: delegates to CanvasBackgroundLayer (44 live effects from shadcn.io catalog)
 * custom: user image or video via Tauri asset protocol
 * dark:   solid #0a0a0f
 * Overlay tint (color + opacity) sits on top of any base layer.
 */

import type { ShellTheme } from '../../shell/useShellTheme';
import { CanvasBackgroundLayer } from '../background/CanvasBackgroundLayer';
import type { CanvasChromeSettings } from '../../lib/canvasChromeSettings';

interface Props {
  theme: ShellTheme;
}

export function ShellBackground({ theme }: Props) {
  // Map theme overlay into CanvasChromeSettings for the canvas layer
  const chrome: CanvasChromeSettings = {
    bgOverlayColor: theme.overlayColor,
    bgOverlayOpacity: theme.overlayOpacity,
    cardBackgroundColor: '#ffffff',
    cardOpacity: 0.78,
    cardBorderOpacity: 0.55,
    cardBlurPx: 24,
    primaryTextColor: theme.colorScheme === 'light' ? '#0f172a' : '#f8fafc',
    mutedTextColor: theme.colorScheme === 'light' ? '#475569' : '#94a3b8',
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* ── Base layer ─────────────────────────────────────────────── */}
      {theme.backgroundType === 'canvas' && (
        <CanvasBackgroundLayer
          backgroundId={theme.canvasBackgroundId}
          chrome={chrome}
        />
      )}

      {theme.backgroundType === 'dark' && (
        <div className="absolute inset-0 bg-[#0a0a0f]" />
      )}

      {theme.backgroundType === 'custom' && theme.customBgPath && (
        <CustomMediaLayer path={theme.customBgPath} kind={theme.customBgKind} />
      )}

      {/* Overlay tint is handled by CanvasBackgroundLayer's chrome.bgOverlayOpacity
          for canvas mode. For custom/dark we render it here separately. */}
      {theme.backgroundType !== 'canvas' && theme.overlayOpacity > 0 && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: theme.overlayColor, opacity: theme.overlayOpacity }}
        />
      )}
    </div>
  );
}

// ─── Custom Image / Video ─────────────────────────────────────────────────────

function CustomMediaLayer({ path, kind }: { path: string; kind: 'image' | 'video' | null }) {
  const src = convertFileSrc(path);
  const isVideo = kind === 'video' || (!kind && /\.(mp4|webm|mov|avi)$/i.test(path));

  return isVideo ? (
    <video
      className="absolute inset-0 w-full h-full object-cover"
      src={src}
      autoPlay loop muted playsInline
    />
  ) : (
    <img className="absolute inset-0 w-full h-full object-cover" src={src} alt="" />
  );
}

function convertFileSrc(path: string): string {
  if (/^(?:https?:|data:|blob:|\/)/i.test(path)) {
    return path;
  }
  const normalized = path.replace(/\\/g, '/');
  return `http://asset.localhost/${encodeURIComponent(normalized)}`;
}
