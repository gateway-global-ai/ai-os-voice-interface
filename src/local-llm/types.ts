/**
 * Local interpretation lane — types (AIOS-SPEC-009 §16, OLLAMA_RUNTIME_STANDARD).
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type LocalModelReadinessStatus =
  | 'not_installed'
  | 'installed_not_running'
  | 'running_no_models'
  | 'running_ready'
  | 'degraded';

export type LocalLlmFallbackPolicy = 'disabled' | 'proposal' | 'allowed';

export type LocalModelReadiness = {
  status: LocalModelReadinessStatus;
  runtime: 'ollama';
  baseUrl: string;
  version?: string;
  models: string[];
  requiredModels: string[];
  missingModels: string[];
  latencyMs?: number;
  lastCheckedAt: string;
  error?: string;
  fallbackPolicy: LocalLlmFallbackPolicy;
  localLlmEnabled: boolean;
};

/** Recorded per interpretation step for audit (POL-MODEL-003). */
export type InterpretationLaneTrace = {
  lane: 'local' | 'remote';
  model?: string;
  fallbackUsed?: boolean;
  fallbackReason?: 'local_unavailable' | 'policy_allowed_fallback' | 'user_selected' | 'none';
};
