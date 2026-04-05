/**
 * Intent primitive & execution plan (AIOS-SPEC-009) — shared entry.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type {
  Actor,
  Action,
  ExecutionPlan,
  Intent,
  PromotionEvent,
  PromotionMetadata,
  Skill,
  TemporalScope,
  VerificationStatus,
} from './spec009Types';

export type {
  EvaluateExecutionPlanContext,
  ExecutionPlanDecision,
  ExecutionPlanEvaluation,
} from './executionPlanPolicy';

export { evaluateExecutionPlan } from './executionPlanPolicy';

export type { ProposalKind } from './proposalKind';