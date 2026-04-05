/**
 * Dev-only HUD for SPEC-010 scope metrics — not production UX.
 * Shows in `import.meta.env.DEV` unless `VITE_SCOPE_METRICS_HUD=false`.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type ReactElement } from 'react';
import { getScopeMetricsSnapshot, type ScopeMetricsSnapshot } from '../scope/scopeMetrics';

const POLL_MS = 1200;

function hudDisabled(): boolean {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_SCOPE_METRICS_HUD === 'false';
}

export function ScopeMetricsDevHud(): ReactElement | null {
  const [open, setOpen] = useState(true);
  const [snap, setSnap] = useState<ScopeMetricsSnapshot>(() => getScopeMetricsSnapshot());

  useEffect(() => {
    if (!import.meta.env.DEV || hudDisabled()) return;
    const id = window.setInterval(() => {
      setSnap(getScopeMetricsSnapshot());
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!import.meta.env.DEV || hudDisabled()) {
    return null;
  }

  return (
    <div
      className="fixed bottom-3 right-3 z-[9999] max-w-[min(100vw-1.5rem,18rem)] rounded-lg border border-emerald-800/40 bg-zinc-950/95 text-[10px] text-zinc-200 shadow-xl backdrop-blur-sm font-mono"
      data-testid="scope-metrics-dev-hud"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-emerald-400/90 hover:bg-zinc-900/80 rounded-t-lg"
      >
        <span className="font-semibold tracking-wide">SCOPE (dev)</span>
        <span className="text-zinc-500">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <dl className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 px-2 pb-2 text-zinc-300">
          <dt className="text-zinc-500">allow</dt>
          <dd className="text-right tabular-nums">{snap.scopeCheckAllowed}</dd>
          <dt className="text-zinc-500">deny</dt>
          <dd className="text-right tabular-nums">{snap.scopeCheckDenied}</dd>
          <dt className="text-zinc-500">route invalid</dt>
          <dd className="text-right tabular-nums">{snap.scopeRoutingInvalid}</dd>
          <dt className="text-zinc-500 col-span-2 pt-1 border-t border-zinc-800">summarize</dt>
          <dt className="text-zinc-500">last thread payload</dt>
          <dd className="text-right tabular-nums">{snap.lastSummarizeThreadPayloadChars} ch</dd>
          <dt className="text-zinc-500">last bounded prompt</dt>
          <dd className="text-right tabular-nums">{snap.lastSummarizeBoundedPromptChars} ch</dd>
          <dt className="text-zinc-500">avg bounded prompt</dt>
          <dd className="text-right tabular-nums">{snap.summarizeBoundedPromptAvgChars} ch</dd>
        </dl>
      ) : null}
    </div>
  );
}
