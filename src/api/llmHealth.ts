/**
 * Lightweight connectivity checks for LLM keys (injected at build via vite.config define).
 * Keys are present in the client bundle — same model as GEMINI_API_KEY for this app.
 */

import { GoogleGenAI } from '@google/genai';

export type ProviderCheck = {
  id: 'gemini' | 'openai' | 'deepseek' | 'governance_api';
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
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return {
      id: 'gemini',
      label: 'Gemini',
      ok: false,
      detail: 'GEMINI_API_KEY missing (add to .env.local in ai-os-voice-interface)',
      ms: 0,
    };
  }
  try {
    const { ms, result } = await timed(async () => {
      const ai = new GoogleGenAI({ apiKey: key });
      await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'ping',
      });
      return true;
    });
    return { id: 'gemini', label: 'Gemini', ok: true, detail: 'generateContent OK', ms };
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

/** Proxied governance API (Vite → localhost:8100). Optional if server not running. */
export async function checkGovernanceApi(): Promise<ProviderCheck> {
  try {
    const { ms } = await timed(async () => {
      const res = await fetch('/api/documents?limit=1');
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }
    });
    return {
      id: 'governance_api',
      label: 'Governance API',
      ok: true,
      detail: 'GET /api/documents OK (proxy → :8100)',
      ms,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      id: 'governance_api',
      label: 'Governance API',
      ok: false,
      detail: msg.includes('Failed to fetch')
        ? 'Not reachable — start: py C:\\Apps\\governing_docs\\scripts\\governance_api.py'
        : msg,
      ms: 0,
    };
  }
}

export async function runAllProviderChecks(): Promise<ProviderCheck[]> {
  const [gemini, openai, deepseek, gov] = await Promise.all([
    checkGemini(),
    checkOpenAI(),
    checkDeepSeek(),
    checkGovernanceApi(),
  ]);
  return [gemini, openai, deepseek, gov];
}
