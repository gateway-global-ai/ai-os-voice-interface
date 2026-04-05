/**
 * AIOS-SPEC-010 Execution Scope Envelope — minimal TypeScript mirror of the normative JSON shape.
 * Workspace flows use logical resource keys (e.g. gmail:thread:…) where repository paths do not apply.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type ScopeConfidenceLevel = 'high' | 'medium' | 'low';

/** Nested `scope` object per SPEC-010 §4. */
export type ExecutionScopePaths = {
  review_files: string[];
  modify_files: string[];
  protected_files: string[];
  governing_docs: string[];
  verification_targets: string[];
};

/**
 * Top-level scope object carried on plans and optional routing envelopes (SPEC-010 §4).
 */
export type ExecutionScopeEnvelope = {
  schema_version: '1.0';
  intent_summary: string;
  plan_id: string;
  scope_confidence: ScopeConfidenceLevel;
  scope_rationale: string[];
  scope: ExecutionScopePaths;
};
