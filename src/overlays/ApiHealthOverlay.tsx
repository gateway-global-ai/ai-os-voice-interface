/**
 * Menu: API connectivity — LLM keys and optional local service checks.
 */

import { useCallback, useState } from 'react';
import { Activity, Check, Loader2, X } from 'lucide-react';
import { runAllProviderChecks, type ProviderCheck } from '../api/llmHealth';

export function ApiHealthOverlay({ onClose }: { onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ProviderCheck[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const rows = await runAllProviderChecks();
      setResults(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <div className="relative z-20 w-full md:max-w-md lg:max-w-lg mx-0 md:mx-4 p-6 md:p-8 rounded-none md:rounded-[2rem] bg-white/90 backdrop-blur-2xl border-y md:border border-zinc-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-emerald-500/10 rounded-2xl">
          <Activity className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">API health</h2>
          <p className="text-zinc-500 text-sm">
            Test Gemini, OpenAI, DeepSeek, and local Ollama readiness
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
        Keys load from <code className="text-zinc-700">ai-os-voice-interface/.env.local</code> at dev
        build time. Python scripts under <code className="text-zinc-700">governing_docs</code> can read
        the same file (after <code className="text-zinc-700">governing_docs/.env</code>).
      </p>

      <button
        type="button"
        onClick={() => void run()}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60 transition-colors"
      >
        {running ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Running checks…
          </>
        ) : (
          <>
            <Activity className="w-5 h-5" />
            Run health check
          </>
        )}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>
      )}

      {results && (
        <ul className="mt-6 space-y-2">
          {results.map((r) => (
            <li
              key={r.id}
              className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                r.ok ? 'bg-emerald-50/80 border-emerald-100' : 'bg-amber-50/80 border-amber-100'
              }`}
            >
              {r.ok ? (
                <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <X className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-zinc-900 flex flex-wrap items-baseline gap-2">
                  {r.label}
                  {r.ms > 0 && <span className="text-zinc-400 font-normal text-xs">{r.ms} ms</span>}
                </div>
                <div className="text-zinc-600 break-words mt-0.5">{r.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full py-3 rounded-2xl bg-zinc-100 text-zinc-900 font-semibold hover:bg-zinc-200 border border-zinc-200 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
