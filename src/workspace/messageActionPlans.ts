/**
 * Execution plans for governed selected-message actions (SPEC-009) + policy evaluation.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { Actor, ExecutionPlan, TemporalScope } from '../intent/spec009Types';
import { evaluateExecutionPlan, type ExecutionPlanDecision } from '../intent/executionPlanPolicy';
import { mapPolicyReasonsToUserCopy } from '../intent/policyReasonsUserCopy';
import {
  buildMailDraftReplyScope,
  buildMailThreadReadScope,
  buildMailThreadSummarizeScope,
} from '../scope/buildExecutionScope';

export const MESSAGE_ACTION_ACTOR: Actor = { id: 'local-founder', role: 'founder' };

const THREAD_SCOPE: TemporalScope = {
  preset: 'last_7_days',
  isExplicit: false,
  isDefaulted: true,
};

/** MCP thread read + local interpretation — single read action, multiple skills (POL-INTENT-006 read auto-approve). */
export function buildSummarizeThreadPlan(threadId: string): ExecutionPlan {
  return {
    intentId: 'workspace.mail.thread.summarize',
    temporalScope: THREAD_SCOPE,
    skills: [
      { id: 'mail-thread-read', capabilityRef: 'workspace.mail.thread.read' },
      { id: 'local-llm-summarize', capabilityRef: 'local.llm.summarize' },
    ],
    actions: [
      {
        id: 'thread-summarize',
        description: 'Load Gmail thread via MCP and summarize with local LLM (or policy fallback)',
        kind: 'read',
      },
    ],
    expectedOutcome: 'Short thread summary (local interpretation lane by default)',
    riskLevel: 'low',
    verificationStatus: 'unverified',
    executionScope: buildMailThreadSummarizeScope(threadId),
  };
}

/** Read full thread content (MCP extended: get_gmail_thread_content) — read plane, single step. */
export function buildThreadReadPlan(threadId: string): ExecutionPlan {
  return {
    intentId: 'workspace.mail.thread.read',
    temporalScope: THREAD_SCOPE,
    skills: [{ id: 'mail-thread-read', capabilityRef: 'workspace.mail.thread.read' }],
    actions: [
      {
        id: 'load-thread',
        description: 'Load full Gmail thread content for review',
        kind: 'read',
      },
    ],
    expectedOutcome: 'Thread text for review (basis for summarization in-product)',
    riskLevel: 'low',
    verificationStatus: 'unverified',
    executionScope: buildMailThreadReadScope(threadId),
  };
}

/** Create a reply draft — draft plane; policy usually requires proposal. */
export function buildDraftReplyPlan(messageId: string, threadId?: string): ExecutionPlan {
  return {
    intentId: 'workspace.mail.draft_reply',
    temporalScope: THREAD_SCOPE,
    skills: [{ id: 'mail-draft-reply', capabilityRef: 'workspace.mail.draft_reply' }],
    actions: [
      {
        id: 'draft-reply',
        description: 'Create a Gmail draft reply to the selected message',
        kind: 'draft',
      },
    ],
    expectedOutcome: 'Draft reply saved in Gmail (not sent)',
    riskLevel: 'low',
    verificationStatus: 'unverified',
    executionScope: buildMailDraftReplyScope(messageId, threadId),
  };
}

export type MessageActionPolicyResult = {
  decision: ExecutionPlanDecision;
  userMessages: string[];
};

export function runMessageActionPolicy(
  plan: ExecutionPlan,
  mode: 'founder' | 'operator' = 'founder'
): MessageActionPolicyResult {
  const evaluation = evaluateExecutionPlan(plan, { actor: MESSAGE_ACTION_ACTOR, mode });
  return {
    decision: evaluation.decision,
    userMessages: mapPolicyReasonsToUserCopy(evaluation.reasons),
  };
}
