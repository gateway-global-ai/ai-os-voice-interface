/**
 * Coded reason for require_proposal — use with policyDecision for compact UI (not freeform server text).
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type ProposalKind =
  | 'write_action'
  | 'draft_action'
  | 'multi_step_plan'
  | 'unverified_plan'
  | 'high_risk_read'
  | 'default_review';
