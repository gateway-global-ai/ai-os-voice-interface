/**
 * Same-origin local LLM API (Vite dev middleware → Ollama).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { LocalModelReadiness } from '../local-llm/types';

export async function fetchLocalModelReadiness(): Promise<LocalModelReadiness> {
  const res = await fetch('/api/local-model/readiness');
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET /api/local-model/readiness HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  return JSON.parse(text) as LocalModelReadiness;
}

export type LocalModelChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function postLocalModelChat(body: {
  model: string;
  messages: LocalModelChatMessage[];
}): Promise<{ content: string; lane: 'local' }> {
  const res = await fetch('/api/local-model/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: { content?: string; lane?: string; error?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`POST /api/local-model/chat: invalid JSON (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return { content: json.content ?? '', lane: 'local' };
}
