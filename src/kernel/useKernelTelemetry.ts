import { useCallback, useRef } from 'react';

const CORRECTION_WINDOW_MS = 2_000;

export interface TelemetryPayload {
  scaffolding_density: number;
  dwell_to_action_ms: number;
  correction_rate: number;
  context_ratio: number;
}

export interface BargeInRecord {
  completion_pct: number;   // 0.0–1.0
  elapsed_ms: number;
  disc_signal: 'high_dominance' | 'low_context_ratio' | 'neutral';
}

type TelemetryState = {
  startTime: number;
  interactions: number;
  corrections: number;
  scaffoldingDensity: number;
  lastFlushTime: number | null;
  active: boolean;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function useKernelTelemetry() {
  const telemetry = useRef<TelemetryState>({
    startTime: performance.now(),
    interactions: 0,
    corrections: 0,
    scaffoldingDensity: 1,
    lastFlushTime: null,
    active: false,
  });

  const beginInteraction = useCallback(() => {
    const now = performance.now();
    if (telemetry.current.active) return;

    telemetry.current.active = true;
    telemetry.current.startTime = now;
    telemetry.current.interactions = 0;
    telemetry.current.corrections =
      telemetry.current.lastFlushTime !== null &&
      now - telemetry.current.lastFlushTime < CORRECTION_WINDOW_MS
        ? 1
        : 0;
  }, []);

  const recordInteraction = useCallback((isCorrection = false) => {
    if (!telemetry.current.active) {
      const now = performance.now();
      telemetry.current.active = true;
      telemetry.current.startTime = now;
      telemetry.current.interactions = 0;
      telemetry.current.corrections =
        telemetry.current.lastFlushTime !== null &&
        now - telemetry.current.lastFlushTime < CORRECTION_WINDOW_MS
          ? 1
          : 0;
    }

    telemetry.current.interactions += 1;
    if (isCorrection) telemetry.current.corrections += 1;
  }, []);

  const setScaffolding = useCallback((value: number) => {
    telemetry.current.scaffoldingDensity = clamp01(value);
  }, []);

  const resetTelemetry = useCallback(() => {
    telemetry.current = {
      ...telemetry.current,
      startTime: performance.now(),
      interactions: 0,
      corrections: 0,
      active: false,
    };
  }, []);

  /**
   * Record a barge-in event (user pressed mic while AI was speaking).
   * Always counts as a correction. For low_context_ratio signals, the
   * scaffolding density is reduced proportionally to how early the interrupt
   * occurred — earlier = AI was less relevant.
   */
  const recordBargein = useCallback((payload: BargeInRecord) => {
    recordInteraction(true); // always a correction
    if (payload.disc_signal === 'low_context_ratio') {
      // The earlier the interrupt, the more we penalise scaffolding density
      telemetry.current.scaffoldingDensity = clamp01(
        telemetry.current.scaffoldingDensity * (0.6 + payload.completion_pct * 0.4)
      );
    }
  }, [recordInteraction]);

  const flushTelemetry = useCallback((): TelemetryPayload => {
    const now = performance.now();
    const {
      startTime,
      interactions,
      corrections,
      scaffoldingDensity,
      active,
    } = telemetry.current;

    const dwellTime = active ? Math.max(1, Math.round(now - startTime)) : 1;
    const correctionRate =
      interactions > 0 ? clamp01(corrections / interactions) : corrections > 0 ? 1 : 0;
    const contextRatio = clamp01(scaffoldingDensity * (1 - correctionRate));

    const payload = {
      scaffolding_density: scaffoldingDensity,
      dwell_to_action_ms: dwellTime,
      correction_rate: correctionRate,
      context_ratio: Number(contextRatio.toFixed(4)),
    };

    telemetry.current = {
      startTime: now,
      interactions: 0,
      corrections: 0,
      scaffoldingDensity,
      lastFlushTime: now,
      active: false,
    };

    return payload;
  }, []);

  return {
    beginInteraction,
    recordInteraction,
    setScaffolding,
    resetTelemetry,
    recordBargein,
    flushTelemetry,
  };
}
