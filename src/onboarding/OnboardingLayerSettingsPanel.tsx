import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers } from 'lucide-react';

export type OnboardingLayerOpacities = {
  /** Full-viewport atmospheric gradient on top of video */
  globalScrim: number;
  /** Edge vignette (inset shadow) */
  vignette: number;
  /** Bottom-only gradient wash */
  bottomWash: number;
  /** Landing card glass fill (slate-950) */
  landingCard: number;
};

export const ONBOARDING_LAYER_DEFAULTS: OnboardingLayerOpacities = {
  globalScrim: 100,
  vignette: 100,
  bottomWash: 48,
  landingCard: 28,
};

export const ONBOARDING_LAYER_STORAGE_KEY = 'aios.onboarding.layerOpacities';

export function loadOnboardingLayerOpacities(): OnboardingLayerOpacities {
  try {
    const raw = localStorage.getItem(ONBOARDING_LAYER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OnboardingLayerOpacities>;
      return { ...ONBOARDING_LAYER_DEFAULTS, ...parsed };
    }
    const legacy = localStorage.getItem('aios.onboarding.landingCardOverlayOpacity');
    if (legacy != null) {
      const n = Number.parseFloat(legacy);
      if (!Number.isNaN(n) && n >= 0 && n <= 100) {
        return { ...ONBOARDING_LAYER_DEFAULTS, landingCard: n };
      }
    }
  } catch {
    /* ignore */
  }
  return { ...ONBOARDING_LAYER_DEFAULTS };
}

export function persistOnboardingLayerOpacities(layers: OnboardingLayerOpacities): void {
  try {
    localStorage.setItem(ONBOARDING_LAYER_STORAGE_KEY, JSON.stringify(layers));
  } catch {
    /* ignore */
  }
}

const ROWS: { key: keyof OnboardingLayerOpacities; label: string; hint: string }[] = [
  { key: 'globalScrim', label: 'Global scrim', hint: 'Full-screen gradient over video' },
  { key: 'vignette', label: 'Vignette', hint: 'Darkened frame / edge falloff' },
  { key: 'bottomWash', label: 'Bottom wash', hint: 'Footer gradient band' },
  {
    key: 'landingCard',
    label: 'Landing card',
    hint: 'Panel fill + backdrop blur (both scale to 0)',
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  layers: OnboardingLayerOpacities;
  onChange: (next: OnboardingLayerOpacities) => void;
};

export function OnboardingLayerSettingsPanel({ open, onClose, layers, onChange }: Props) {
  const setField = useCallback(
    (key: keyof OnboardingLayerOpacities, value: number) => {
      const clamped = Math.min(100, Math.max(0, value));
      onChange({ ...layers, [key]: clamped });
    },
    [layers, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#020617]/75 backdrop-blur-sm"
            aria-label="Close layer settings"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-layer-panel-title"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-cyan-500/35 bg-slate-950/92 shadow-[0_0_60px_-10px_rgba(34,211,238,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grid + corner accents */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(34, 211, 238, 0.07) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(34, 211, 238, 0.07) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />
            <div className="pointer-events-none absolute left-2 top-2 h-6 w-6 border-l-2 border-t-2 border-cyan-400/50" />
            <div className="pointer-events-none absolute right-2 top-2 h-6 w-6 border-r-2 border-t-2 border-cyan-400/50" />
            <div className="pointer-events-none absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-cyan-400/50" />
            <div className="pointer-events-none absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-cyan-400/50" />

            <div className="relative border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-slate-950/60 to-indigo-950/40 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                    <Layers className="h-5 w-5 text-cyan-300" aria-hidden />
                  </div>
                  <div>
                    <h2
                      id="onboarding-layer-panel-title"
                      className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100"
                    >
                      Visual stack
                    </h2>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      Layer opacities · video base locked
                    </p>
                    <p className="mt-2 max-w-[42ch] text-left font-mono text-[10px] leading-snug text-slate-500">
                      Saved per site URL. Tauri uses <span className="text-slate-400">localhost:5173</span>; opening the
                      app at <span className="text-slate-400">192.168…:5173</span> is a different storage — sliders
                      won’t match until you use the same origin.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-slate-600/60 bg-slate-900/80 p-1.5 text-slate-400 transition hover:border-cyan-500/40 hover:text-cyan-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative space-y-5 px-5 py-5">
              {ROWS.map(({ key, label, hint }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <label
                        className="font-mono text-xs font-medium uppercase tracking-wide text-cyan-200/90"
                        htmlFor={`layer-${key}`}
                      >
                        {label}
                      </label>
                      <p className="font-mono text-[10px] text-slate-500">{hint}</p>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-cyan-400/90">{Math.round(layers[key])}</span>
                  </div>
                  <input
                    id={`layer-${key}`}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={layers[key]}
                    onChange={(e) => setField(key, Number(e.target.value))}
                    className="h-2 w-full cursor-pointer accent-cyan-500"
                  />
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...ONBOARDING_LAYER_DEFAULTS })}
                  className="font-mono text-[10px] uppercase tracking-wider text-cyan-500/80 underline-offset-2 hover:text-cyan-300 hover:underline"
                >
                  Reset defaults
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
