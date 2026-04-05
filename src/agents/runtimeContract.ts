/**
 * Local coding-agent runtime contract (Ollama / bounded executors).
 * Aligns with AIOS-SPEC-010 (execution scope), SPEC-009 (plans), and ICP patterns.
 *
 * Roles are separated so no single model holds both scope authority and unbounded tools.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { ExecutionScopeEnvelope, ScopeConfidenceLevel } from '../scope/executionScopeTypes';

/** Distinct agent roles — do not collapse into one “coder” chat model. */
export type CodingAgentRole = 'planner' | 'implementer' | 'verifier';

/** Per-task model lane — not a global default. */
export type ModelLaneProfile = {
  /** Ollama model tag, e.g. `qwen2.5-coder:7b` */
  modelName: string;
  contextWindowTokens?: number;
  maxOutputTokens?: number;
  temperature?: number;
  /** If true, lane may request escalation to a stronger model (human/system decides). */
  escalationAllowed: boolean;
};

/**
 * Tool identifiers for allow-listing — map to concrete MCP / host tools at integration time.
 * No broad shell or unconstrained FS by default.
 */
export type CodingToolId =
  | 'read_file'
  | 'write_file'
  | 'repo_index_search'
  | 'run_tests'
  | 'run_build'
  | 'run_lint'
  | 'read_governance_doc'
  | 'list_routes_or_owners';

/** Planner proposes scope; it must not edit product code. */
export type PlannerAgentInput = {
  role: 'planner';
  intent_summary: string;
  plan_id: string;
  /** Optional high-level execution plan text (SPEC-009) — not yet approved scope. */
  executionPlanNarrative?: string;
  /** Precomputed bounded digest (subsystem map, key paths) — not full repo scan. */
  repoIndexDigest?: string;
};

export type PlannerAgentOutput = {
  proposed_scope: ExecutionScopeEnvelope;
  /** If low, operator review required per SPEC-010 §3.1. */
  scope_confidence: ScopeConfidenceLevel;
  verification_targets: string[];
  /** Human-readable bullets for audit. */
  scope_rationale: string[];
  /** When the planner cannot bound work safely. */
  scope_expansion_request?: string;
};

/** Implementer edits only within approved envelope + tool allow-list. */
export type ImplementerAgentInput = {
  role: 'implementer';
  executionScope: ExecutionScopeEnvelope;
  task_description: string;
  modelLane: ModelLaneProfile;
  allowedTools: readonly CodingToolId[];
};

export type ImplementerAgentOutput = {
  patch_summary: string;
  files_changed: string[];
  unresolved_issues?: string[];
  /** Request re-compilation / operator approval — never silent scope growth. */
  scope_expansion_requests?: string[];
};

/** Verifier runs checks listed on the envelope; does not author product edits by default. */
export type VerifierAgentInput = {
  role: 'verifier';
  executionScope: ExecutionScopeEnvelope;
  /** Commands or named checks from `verification_targets` + build/test policy. */
  commands_to_run: string[];
  /** Optional summary of artifacts from implementer (paths, build dir). */
  artifact_summary?: string;
};

export type VerifierCommandResult = {
  command: string;
  exitCode: number;
  stdout_snippet?: string;
  stderr_snippet?: string;
};

export type VerifierAgentOutput = {
  passed: boolean;
  results: VerifierCommandResult[];
  drift_notes?: string[];
};

/** Bundle passed into a future Ollama / agent host — single configuration surface. */
export type CodingAgentRuntimeBundle = {
  planner: Pick<PlannerAgentInput, 'plan_id' | 'intent_summary'> & {
    output?: PlannerAgentOutput;
  };
  implementer?: {
    input: ImplementerAgentInput;
    output?: ImplementerAgentOutput;
  };
  verifier?: {
    input: VerifierAgentInput;
    output?: VerifierAgentOutput;
  };
};

/** Policy reminders embedded in prompts — agents are not the permission authority. */
export const CODING_AGENT_POLICY_REMINDERS = [
  'You do not define your own permissions; execution scope is authoritative.',
  'Writes outside modify_files (or host-enforced equivalents) are invalid.',
  'Reads outside review_files / modify_files / governing_docs require re-compilation or approval.',
  'Scope expansion requires a new plan_id and operator or DCP-approved change.',
] as const;
