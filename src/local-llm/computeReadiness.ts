/**
 * Ollama readiness — intended for Node (Vite middleware) or any runtime with fetch.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { LocalLlmFallbackPolicy, LocalModelReadiness, LocalModelReadinessStatus } from './types';
import { tagSatisfiesRequired } from './modelPick';

function parseRequired(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function classifyMissing(models: string[], required: string[]): string[] {
  return required.filter((req) => !models.some((m) => tagSatisfiesRequired(m, req)));
}

function parseFallback(raw: string | undefined): LocalLlmFallbackPolicy {
  const v = raw?.trim().toLowerCase();
  if (v === 'proposal' || v === 'allowed' || v === 'disabled') return v;
  return 'disabled';
}

/**
 * Compute readiness by calling Ollama HTTP API from Node (same host as Vite middleware).
 * Pass `env` from `loadEnv` in Vite or `process.env` in scripts.
 */
export async function computeLocalModelReadiness(env: Record<string, string>): Promise<LocalModelReadiness> {
  const lastCheckedAt = new Date().toISOString();
  const baseUrl = (env.OLLAMA_BASE_URL || env.VITE_OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const requiredModels = parseRequired(env.OLLAMA_REQUIRED_MODELS);
  const fallbackPolicy = parseFallback(env.LOCAL_LLM_FALLBACK);
  const localLlmEnabled = (env.LOCAL_LLM_ENABLED ?? 'true').trim().toLowerCase() !== 'false';

  if (!localLlmEnabled) {
    return {
      status: 'degraded',
      runtime: 'ollama',
      baseUrl,
      models: [],
      requiredModels,
      missingModels: requiredModels,
      lastCheckedAt,
      error: 'LOCAL_LLM_ENABLED=false',
      fallbackPolicy,
      localLlmEnabled: false,
    };
  }

  const runtimeId = (env.LOCAL_LLM_RUNTIME || 'ollama').trim().toLowerCase();
  if (runtimeId !== 'ollama') {
    return {
      status: 'degraded',
      runtime: 'ollama',
      baseUrl,
      models: [],
      requiredModels,
      missingModels: requiredModels,
      lastCheckedAt,
      error: `LOCAL_LLM_RUNTIME=${runtimeId} not supported (only ollama in this build)`,
      fallbackPolicy,
      localLlmEnabled: true,
    };
  }

  const t0 = Date.now();
  let latencyMs: number | undefined;
  let version: string | undefined;
  let status: LocalModelReadinessStatus = 'installed_not_running';
  let models: string[] = [];
  let error: string | undefined;

  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), 8000);
  try {
    const tagsRes = await fetch(`${baseUrl}/api/tags`, {
      signal: ac.signal,
    });
    latencyMs = Date.now() - t0;
    if (!tagsRes.ok) {
      throw new Error(`GET /api/tags HTTP ${tagsRes.status}`);
    }
    const tagsJson = (await tagsRes.json()) as { models?: { name?: string }[] };
    models = (tagsJson.models ?? []).map((m) => m.name ?? '').filter(Boolean);

    clearTimeout(tid);
    try {
      const ac2 = new AbortController();
      const t2 = setTimeout(() => ac2.abort(), 3000);
      const verRes = await fetch(`${baseUrl}/api/version`, { signal: ac2.signal });
      clearTimeout(t2);
      if (verRes.ok) {
        const v = (await verRes.json()) as { version?: string };
        version = v.version;
      }
    } catch {
      /* optional */
    }

    if (models.length === 0) {
      status = 'running_no_models';
    } else {
      const missing = classifyMissing(models, requiredModels);
      if (requiredModels.length === 0) {
        status = models.length > 0 ? 'running_ready' : 'running_no_models';
      } else if (missing.length === 0) {
        status = 'running_ready';
      } else if (models.length > 0) {
        status = 'degraded';
      } else {
        status = 'running_no_models';
      }
    }
  } catch (e) {
    clearTimeout(tid);
    const msg = e instanceof Error ? e.message : String(e);
    error = msg;
    if (/ECONNREFUSED|Failed to fetch|network|fetch/i.test(msg) || msg.includes('aborted')) {
      status = 'installed_not_running';
    } else {
      status = 'degraded';
    }
  }

  const missingModels = classifyMissing(models, requiredModels);

  return {
    status,
    runtime: 'ollama',
    baseUrl,
    version,
    models,
    requiredModels,
    missingModels,
    latencyMs,
    lastCheckedAt,
    error,
    fallbackPolicy,
    localLlmEnabled: true,
  };
}
