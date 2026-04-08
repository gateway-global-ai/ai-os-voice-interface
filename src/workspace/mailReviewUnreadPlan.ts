/**
 * Phase 1 vertical slice: "Review unread emails (last 7 days)" — AIOS-SPEC-009 §15 + POL-INTENT-004–006.
 * Builds a governed ExecutionPlan, evaluates policy, and supplies Gmail query for the control plane.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { Actor, ExecutionPlan, TemporalScope } from '../intent/spec009Types';
import {
  evaluateExecutionPlan,
  type ExecutionPlanDecision,
} from '../intent/executionPlanPolicy';
import { mapPolicyReasonsToUserCopy } from '../intent/policyReasonsUserCopy';

/** Gmail / API search query (temporal + unread). */
export const GMAIL_REVIEW_UNREAD_7D_QUERY = 'newer_than:7d is:unread';

export const MAIL_REVIEW_UNREAD_INTENT_ID = 'workspace.mail.review_unread_7d';

/** Human-readable labels for workspace mail UI (POL-WS-UI / SPEC-009 disclosure). */
export const MAIL_REVIEW_UNREAD_INTENT_LABEL = 'Review unread emails (last 7 days)';
export const MAIL_REVIEW_UNREAD_PERIOD_LABEL = 'Last 7 days';

/** Primary human scope line — policy language, not Gmail syntax (POL-WS-UI). */
export const MAIL_REVIEW_UNREAD_SCOPE_SUMMARY =
  'Unread mail from the last 7 days, bounded so review stays actionable.';

/** Shown when policy auto-approves — explains why no proposal step (Phase 1 read plane). */
export const MAIL_REVIEW_UNREAD_APPROVAL_RATIONALE: readonly string[] = [
  'Read-only scope (no send or modify)',
  'Time-bounded window (last 7 days)',
  'Single bounded search step (SPEC-009 Phase 1 read plane)',
  'Low-risk execution plan',
];

export const FOUNDER_ACTOR: Actor = { id: 'local-founder', role: 'founder' };

export function buildReviewUnreadMailExecutionPlan(): ExecutionPlan {
  const temporalScope: TemporalScope = {
    preset: 'last_7_days',
    isExplicit: false,
    isDefaulted: true,
  };
  return {
    intentId: MAIL_REVIEW_UNREAD_INTENT_ID,
    temporalScope,
    skills: [{ id: 'mail-search', capabilityRef: 'workspace.mail.search' }],
    actions: [
      {
        id: 'search-unread-7d',
        description: 'Search Gmail for unread messages in the last 7 days',
        kind: 'read',
      },
    ],
    expectedOutcome: 'Unread messages from the last 7 days, for review',
    riskLevel: 'low',
    verificationStatus: 'unverified',
  };
}

export type MailReviewUnreadPolicyResult = {
  plan: ExecutionPlan;
  evaluation: { decision: ExecutionPlanDecision; reasons: string[] };
  userMessages: string[];
  gmailQuery: string;
};

export function runReviewUnreadMailPolicy(): MailReviewUnreadPolicyResult {
  const plan = buildReviewUnreadMailExecutionPlan();
  const evaluation = evaluateExecutionPlan(plan, { actor: FOUNDER_ACTOR, mode: 'founder' });
  const userMessages = mapPolicyReasonsToUserCopy(evaluation.reasons);
  return {
    plan,
    evaluation,
    userMessages,
    gmailQuery: GMAIL_REVIEW_UNREAD_7D_QUERY,
  };
}
