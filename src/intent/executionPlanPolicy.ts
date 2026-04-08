/**
 * POL-INTENT-006 / §15.7 — decide auto-approve vs proposal vs block before execution.
 *
 * Phase 1: **conservative** rules — not final trust logic. Future versions should factor in
 * verification history, actor class, domain, plan novelty, and reuse scope before widening `auto_approve`.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { Actor, ExecutionPlan } from './spec009Types';

export type ExecutionPlanDecision = 'auto_approve' | 'require_proposal' | 'block';

export interface ExecutionPlanEvaluation {
  decision: ExecutionPlanDecision;
  reasons: string[];
}

export interface EvaluateExecutionPlanContext {
  actor: Actor;
  /** Surface mode — extend per product. */
  mode?: 'founder' | 'operator' | 'customer' | 'dev';
}

/**
 * Single policy entry point for execution gating (AIOS-SPEC-009 §15.5, §15.7).
 * Conservative defaults: writes and unverified multi-step plans require proposal.
 */
export function evaluateExecutionPlan(
  plan: ExecutionPlan,
  context: EvaluateExecutionPlanContext
): ExecutionPlanEvaluation {
  const reasons: string[] = [];
  const status = plan.verificationStatus ?? (plan.verified ? 'verified_once' : 'unverified');

  if (status === 'promotion_blocked') {
    reasons.push('Plan is marked promotion_blocked — execution not allowed until policy review.');
    return { decision: 'block', reasons };
  }

  if (plan.skills.length === 0 && plan.actions.length === 0) {
    reasons.push('Empty plan — no skills or actions.');
    return { decision: 'block', reasons };
  }

  const hasWrite = plan.actions.some((a) => a.kind === 'write');
  const hasDraft = plan.actions.some((a) => a.kind === 'draft');
  const isNewPlan = !plan.playbookId;

  if (plan.riskLevel === 'high') {
    reasons.push('High risk level — proposal required.');
    return { decision: 'require_proposal', reasons };
  }

  if (isNewPlan && hasWrite) {
    reasons.push('New plan with write actions — proposal required (POL-INTENT-006).');
    return { decision: 'require_proposal', reasons };
  }

  if (isNewPlan && plan.actions.length > 1) {
    reasons.push('New multi-step plan — proposal required.');
    return { decision: 'require_proposal', reasons };
  }

  if (plan.playbookId) {
    if (hasWrite && status !== 'verified_repeated') {
      reasons.push('Write-plane on playbook requires confirmation until verified_repeated.');
      return { decision: 'require_proposal', reasons };
    }
    if (hasWrite && status === 'verified_repeated') {
      reasons.push('Verified playbook write — confirmation still required by policy (Phase 1).');
      return { decision: 'require_proposal', reasons };
    }
    if (!hasWrite && !hasDraft && status === 'verified_repeated') {
      reasons.push('Known verified read playbook — auto-approve.');
      return { decision: 'auto_approve', reasons };
    }
    if (hasDraft && status === 'verified_repeated') {
      reasons.push('Verified playbook draft — proposal with preview (Phase 1: treat as proposal).');
      return { decision: 'require_proposal', reasons };
    }
  }

  if (!hasWrite && !hasDraft && plan.actions.length <= 1) {
    reasons.push('Single read action — auto-approve (Phase 1 read plane).');
    void context.actor;
    return { decision: 'auto_approve', reasons };
  }

  reasons.push('Default — proposal required for operator review.');
  return { decision: 'require_proposal', reasons };
}