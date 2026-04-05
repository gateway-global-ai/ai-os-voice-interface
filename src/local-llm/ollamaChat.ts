/**
 * Ollama /api/chat (non-streaming) — Node fetch only.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type OllamaChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function ollamaChatNonStreaming(
  env: Record<string, string>,
  opts: { model: string; messages: OllamaChatMessage[] }
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const baseUrl = (env.OLLAMA_BASE_URL || env.VITE_OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), 120000);
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ac.signal,
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: false,
      }),
    });
    clearTimeout(tid);
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${t.slice(0, 400)}` };
    }
    const json = (await res.json()) as {
      message?: { content?: string };
    };
    const content = json.message?.content ?? '';
    return { ok: true, content };
  } catch (e) {
    clearTimeout(tid);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
