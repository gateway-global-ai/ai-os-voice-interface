/**
 * Lightweight connectivity checks for LLM providers and the same-origin Gemini gateway.
 */

import { fetchGeminiGatewayHealth, fetchGeminiGatewayReadiness } from './geminiGateway';

export type ProviderCheck = {
  id: 'gemini' | 'openai' | 'deepseek' | 'documents_proxy' | 'local_llm';
  label: string;
  ok: boolean;
  detail: string;
  ms: number;
};

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; result: T }> {
  const t0 = performance.now();
  const result = await fn();
  return { ms: Math.round(performance.now() - t0), result };
}

export async function checkGemini(): Promise<ProviderCheck> {
  try {
    const readiness = await fetchGeminiGatewayReadiness();
    if (!readiness.configured) {
      return {
        id: 'gemini',
        label: 'Gemini',
        ok: false,
        detail: readiness.detail,
        ms: 0,
      };
    }

    const { ms, result } = await timed(async () => fetchGeminiGatewayHealth());
    return {
      id: 'gemini',
      label: 'Gemini',
      ok: result.ok,
      detail: result.detail,
      ms,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id: 'gemini', label: 'Gemini', ok: false, detail: msg, ms: 0 };
  }
}

export async function checkOpenAI(): Promise<ProviderCheck> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return {
      id: 'openai',
      label: 'OpenAI',
      ok: false,
      detail: 'OPENAI_API_KEY missing',
      ms: 0,
    };
  }
  try {
    const { ms } = await timed(async () => {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }
    });
    return { id: 'openai', label: 'OpenAI', ok: true, detail: '/v1/models OK', ms };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id: 'openai', label: 'OpenAI', ok: false, detail: msg, ms: 0 };
  }
}

export async function checkDeepSeek(): Promise<ProviderCheck> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    return {
      id: 'deepseek',
      label: 'DeepSeek',
      ok: false,
      detail: 'DEEPSEEK_API_KEY missing',
      ms: 0,
    };
  }
  try {
    const { ms } = await timed(async () => {
      const res = await fetch('https://api.deepseek.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }
    });
    return { id: 'deepseek', label: 'DeepSeek', ok: true, detail: '/v1/models OK', ms };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id: 'deepseek', label: 'DeepSeek', ok: false, detail: msg, ms: 0 };
  }
}

/** Ollama readiness via same-origin `/api/local-model/readiness` (Vite dev middleware). */
export async function checkLocalModel(): Promise<ProviderCheck> {
  try {
    const { ms, result } = await timed(async () => {
      const res = await fetch('/api/local-model/readiness');
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      return JSON.parse(text) as Record<string, unknown>;
    });
    const r = result as {
      status?: string;
      baseUrl?: string;
      fallbackPolicy?: string;
      models?: string[];
      requiredModels?: string[];
      missingModels?: string[];
      error?: string;
    };
    const ok = r.status === 'running_ready';
    const detail = JSON.stringify(
      {
        status: r.status,
        baseUrl: r.baseUrl,
        fallbackPolicy: r.fallbackPolicy,
        models: r.models,
        requiredModels: r.requiredModels,
        missingModels: r.missingModels,
        error: r.error,
      },
      null,
      2,
    );
    return {
      id: 'local_llm',
      label: 'Local model (Ollama)',
      ok,
      detail,
      ms,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      id: 'local_llm',
      label: 'Local model (Ollama)',
      ok: false,
      detail: msg.includes('Failed to fetch')
        ? 'Not reachable — start Vite dev (middleware) and Ollama on OLLAMA_BASE_URL'
        : msg,
      ms: 0,
    };
  }
}

/** Optional GET /api/documents (Vite proxy: Governance :8100 with /v1 rewrite, or main API if configured). Dev-only. */
export async function checkOptionalDocumentsProxy(): Promise<ProviderCheck> {
  try {
    const { ms } = await timed(async () => {
      const res = await fetch('/api/documents?limit=1');
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }
    });
    return {
      id: 'documents_proxy',
      label: 'Documents proxy (optional)',
      ok: true,
      detail: 'GET /api/documents OK (Vite proxy per env)',
      ms,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      id: 'documents_proxy',
      label: 'Documents proxy (optional)',
      ok: false,
      detail: msg.includes('Failed to fetch')
        ? 'Not reachable — optional local docs server (see app dev docs)'
        : msg,
      ms: 0,
    };
  }
}

export async function runAllProviderChecks(): Promise<ProviderCheck[]> {
  const [gemini, openai, deepseek, local, gov] = await Promise.all([
    checkGemini(),
    checkOpenAI(),
    checkDeepSeek(),
    checkLocalModel(),
    checkOptionalDocumentsProxy(),
  ]);
  return [gemini, openai, deepseek, local, gov];
}
