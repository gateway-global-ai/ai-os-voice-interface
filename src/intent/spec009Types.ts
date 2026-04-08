/**
 * Canonical types for AIOS-SPEC-009 (Intent Primitive) and §15 (compilation / approval).
 * Single executable interpretation for intent primitives (SPEC-009) — align with governing_docs/specifications/IntentPrimitiveAndExecutionModel.md
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { ExecutionScopeEnvelope } from '../scope/executionScopeTypes';

export interface Actor {
  id: string;
  role: string;
}

/** ISO 8601 date/time strings or date-only per domain pack. */
export type TemporalScope = {
  start?: string;
  end?: string;
  preset?:
    | 'today'
    | 'yesterday'
    | 'last_7_days'
    | 'this_week'
    | 'this_month'
    | 'all_time'
    | 'custom';
  isExplicit: boolean;
  isDefaulted: boolean;
};

export interface Intent {
  id: string;
  domain: string;
  outcome: string;
  actor: Actor;
  plane: 'read' | 'draft' | 'write';
  capabilities: string[];
  constraints: string[];
  confidence: number;
  temporalScope?: TemporalScope;
}

export interface Skill {
  id: string;
  capabilityRef: string;
}

export interface Action {
  id: string;
  description: string;
  kind: 'read' | 'draft' | 'write';
}

/**
 * Do not use a bare boolean for "verified" in promotion paths — use provenance-friendly status (SPEC-009 §15 caution).
 */
export type VerificationStatus =
  | 'unverified'
  | 'verified_once'
  | 'verified_repeated'
  | 'promotion_blocked';

export interface PromotionMetadata {
  approvedBy?: string;
  verifiedAt?: string;
  temporalScope?: TemporalScope;
  domain?: string;
  actorClass?: string;
  /** Whether the playbook is reusable across tenants or scoped. */
  reuseScope?: 'global' | 'tenant';
}

/**
 * Governed promotion event — log / audit shape before a full event bus exists (AIOS-SPEC-009 §15.6).
 * Do not silently "learn"; emit this (or persist) when a plan is promoted to a reusable playbook.
 */
export interface PromotionEvent {
  planId: string;
  approvedBy: string;
  verificationStatus: VerificationStatus;
  promotedAt: string;
  reuseScope: 'global' | 'tenant';
  rationale?: string;
}

export interface ExecutionPlan {
  intentId: string;
  temporalScope: TemporalScope;
  skills: Skill[];
  actions: Action[];
  expectedOutcome: string;
  riskLevel: 'low' | 'medium' | 'high';
  /**
   * AIOS-SPEC-010: when set, execution (MCP / agents) must validate against this envelope.
   * Governed mail thread flows populate this for auditability and ICP enforcement.
   */
  executionScope?: ExecutionScopeEnvelope;
  playbookId?: string;
  /**
   * @deprecated Use `verificationStatus` only. Do not add new reads of this field — migrate callers to `VerificationStatus`.
   * Interim: `evaluateExecutionPlan` maps `verified === true` to `verified_once` when `verificationStatus` is unset.
   */
  verified?: boolean;
  verificationStatus?: VerificationStatus;
  promotionMetadata?: PromotionMetadata;
}