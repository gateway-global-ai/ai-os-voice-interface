/**
 * Match Ollama tag names to required model ids (OLLAMA_REQUIRED_MODELS).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { LocalModelReadiness } from './types';

export function tagSatisfiesRequired(tagName: string, required: string): boolean {
  const t = tagName.toLowerCase();
  const r = required.toLowerCase();
  return t === r || t.startsWith(`${r}:`) || t.includes(r);
}

export function pickOllamaModelForSummarize(readiness: LocalModelReadiness): string | null {
  const { models, requiredModels } = readiness;
  if (models.length === 0) return null;
  for (const req of requiredModels) {
    const m = models.find((x) => tagSatisfiesRequired(x, req));
    if (m) return m;
  }
  return models[0] ?? null;
}
