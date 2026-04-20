/**
 * Menu: API connectivity — LLM keys and optional local service checks.
 */

import { useCallback, useState } from 'react';
import { Activity, Check, Loader2, X } from 'lucide-react';
import { runAllProviderChecks, type ProviderCheck } from '../api/llmHealth';
import { SovereignCard, SovereignTitle, SovereignDescription, SovereignButton } from '../ui-core';

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
    <SovereignCard className="relative z-20 w-full mx-0">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-emerald-500/10 rounded-2xl">
          <Activity className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <SovereignTitle level={2}>API health</SovereignTitle>
          <SovereignDescription>
            Test Gemini, OpenAI, DeepSeek, and local Ollama readiness
          </SovereignDescription>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Keys load from <code className="text-gray-300 bg-white/5 px-1 rounded">ai-os-voice-interface/.env.local</code> at dev
        build time. Python scripts under <code className="text-gray-300 bg-white/5 px-1 rounded">governing_docs</code> can read
        the same file (after <code className="text-gray-300 bg-white/5 px-1 rounded">governing_docs/.env</code>).
      </p>

      <SovereignButton
        onClick={() => void run()}
        disabled={running}
        variant="primary"
        className="w-full"
      >
        {running ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Running checks…
          </>
        ) : (
          <>
            <Activity className="w-5 h-5 mr-2" />
            Run health check
          </>
        )}
      </SovereignButton>

      {error && (
        <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
      )}

      {results && (
        <ul className="mt-6 space-y-2">
          {results.map((r) => (
            <li
              key={r.id}
              className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                r.ok ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
              }`}
            >
              {r.ok ? (
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <X className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-200 flex flex-wrap items-baseline gap-2">
                  {r.label}
                  {r.ms > 0 && <span className="text-gray-500 font-normal text-xs">{r.ms} ms</span>}
                </div>
                <div className="text-gray-400 break-words mt-0.5">{r.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SovereignButton
        onClick={onClose}
        variant="secondary"
        className="w-full mt-6"
      >
        Close
      </SovereignButton>
    </SovereignCard>
  );
}
