/**
 * Shared implementation for GET /api/local-model/readiness and POST /api/local-model/chat.
 * Used by Vite dev middleware and the production Node host — same contract everywhere.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { computeLocalModelReadiness } from './computeReadiness';
import type { LocalModelReadiness } from './types';
import { ollamaChatNonStreaming } from './ollamaChat';

export async function serveLocalModelReadiness(env: Record<string, string>): Promise<LocalModelReadiness> {
  return computeLocalModelReadiness(env);
}

export type LocalModelChatHttpResult = {
  status: number;
  body: Record<string, unknown>;
};

/**
 * POST body: `{ model: string, messages: { role, content }[] }` — same as browser client.
 */
export async function serveLocalModelChat(env: Record<string, string>, body: unknown): Promise<LocalModelChatHttpResult> {
  try {
    if (typeof body !== 'object' || body === null) {
      return { status: 400, body: { error: 'Invalid JSON body' } };
    }
    const b = body as { model?: string; messages?: { role: string; content: string }[] };
    const model = b.model?.trim();
    const messages = b.messages;
    if (!model || !messages?.length) {
      return { status: 400, body: { error: 'model and messages required' } };
    }
    const result = await ollamaChatNonStreaming(env, {
      model,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: String(m.content ?? ''),
      })),
    });
    if (result.ok === true) {
      return { status: 200, body: { content: result.content, lane: 'local' } };
    }
    return { status: 502, body: { error: result.error, lane: 'local' } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 500, body: { error: msg } };
  }
}
