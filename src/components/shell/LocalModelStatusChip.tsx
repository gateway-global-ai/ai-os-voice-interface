/**
 * POL-MODEL-002 — persistent local interpretation lane disclosure (compact).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useId, useState } from 'react';
import { pickOllamaModelForSummarize } from '../../local-llm/modelPick';
import type { LocalLlmFallbackPolicy, LocalModelReadiness } from '../../local-llm/types';

function fallbackLabel(p: LocalLlmFallbackPolicy): string {
  switch (p) {
    case 'disabled':
      return 'Disabled';
    case 'proposal':
      return 'Proposal';
    case 'allowed':
      return 'Allowed';
    default:
      return String(p);
  }
}

function chipLabel(r: LocalModelReadiness): string {
  const modelHint = pickOllamaModelForSummarize(r);
  switch (r.status) {
    case 'running_ready':
      return modelHint ? `Ready (${modelHint})` : 'Ready';
    case 'running_no_models':
      return 'Running, no models';
    case 'installed_not_running':
      return 'Not running';
    case 'not_installed':
      return 'Not installed';
    case 'degraded':
      return 'Degraded';
    default:
      return r.status;
  }
}

export function LocalModelStatusChip({ readiness }: { readiness: LocalModelReadiness | null }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  if (!readiness) {
    return (
      <span className="hidden shrink-0 rounded-full border border-zinc-200/80 bg-white/50 px-2 py-0.5 text-[10px] font-medium text-zinc-500 lg:inline">
        Local model: …
      </span>
    );
  }

  const tone =
    readiness.status === 'running_ready'
      ? 'border-emerald-200/90 bg-emerald-50/90 text-emerald-900'
      : readiness.status === 'degraded' || readiness.status === 'running_no_models'
        ? 'border-amber-200/90 bg-amber-50/80 text-amber-950'
        : 'border-zinc-200/80 bg-zinc-50/80 text-zinc-700';

  return (
    <div className="relative hidden shrink-0 lg:block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`max-w-[14rem] truncate rounded-full border px-2 py-0.5 text-left text-[10px] font-medium shadow-sm transition hover:opacity-95 ${tone}`}
        title="Local interpretation lane (Ollama)"
      >
        <span className="text-zinc-500">Local model:</span> {chipLabel(readiness)}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[var(--z-shell-header)] cursor-default bg-black/0"
            aria-label="Close local model details"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="region"
            className="absolute right-0 top-[calc(100%+6px)] z-[calc(var(--z-shell-header)+1)] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white/95 p-3 text-[11px] text-zinc-800 shadow-lg backdrop-blur-sm"
          >
            <p className="font-semibold text-zinc-900">Local interpretation lane</p>
            <dl className="mt-2 space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Runtime</dt>
                <dd className="font-mono text-right">{readiness.runtime}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Base URL</dt>
                <dd className="max-w-[14rem] truncate font-mono text-right" title={readiness.baseUrl}>
                  {readiness.baseUrl}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Status</dt>
                <dd className="text-right">{readiness.status}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Fallback</dt>
                <dd className="text-right">{fallbackLabel(readiness.fallbackPolicy)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Required models</dt>
                <dd className="text-right">{readiness.requiredModels.length ? readiness.requiredModels.join(', ') : '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Missing</dt>
                <dd className="text-right">{readiness.missingModels.length ? readiness.missingModels.join(', ') : '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Tags</dt>
                <dd className="max-h-20 max-w-[14rem] overflow-y-auto text-right font-mono text-[10px]">
                  {readiness.models.length ? readiness.models.join(', ') : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Checked</dt>
                <dd className="text-right">{readiness.lastCheckedAt}</dd>
              </div>
              {readiness.latencyMs != null ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">API latency</dt>
                  <dd className="text-right">{readiness.latencyMs} ms</dd>
                </div>
              ) : null}
              {readiness.error ? (
                <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-2 py-1.5 text-amber-950">
                  {readiness.error}
                </div>
              ) : null}
            </dl>
          </div>
        </>
      ) : null}
    </div>
  );
}
