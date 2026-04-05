/**
 * Map `evaluateExecutionPlan` technical reasons to user-safe copy (AIOS-SPEC-009 §15, AMD-007).
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** Translate policy evaluator reasons for primary UI (not operator debug). */
export function mapPolicyReasonsToUserCopy(reasons: string[]): string[] {
  return reasons.map((r) => {
    if (r.includes('promotion_blocked')) {
      return 'This plan is blocked until a governance review clears it.';
    }
    if (r.includes('Empty plan')) {
      return 'This action could not be prepared because the plan was empty.';
    }
    if (r.includes('High risk')) {
      return 'This plan needs your review before it can run because it was marked high risk.';
    }
    if (r.includes('New plan with write actions')) {
      return 'Sending or changing data requires your confirmation first.';
    }
    if (r.includes('New multi-step')) {
      return 'Multi-step actions need your review before they can run.';
    }
    if (r.includes('verified_repeated') && r.includes('confirmation still required')) {
      return 'Sending or changing data still needs confirmation for this release.';
    }
    if (r.includes('Known verified read playbook')) {
      return 'This is a read-only action you have run before.';
    }
    if (r.includes('Single read action')) {
      return 'Read-only search — no write or send in this step.';
    }
    if (r.includes('Default')) {
      return 'Review the summary below before continuing.';
    }
    return r;
  });
}
