/**
 * SPEC-010 scope violation visibility — extends workspace audit stream.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { logWorkspaceAudit } from '../workspace/workspaceAudit';
import type { ExecutionScopeEnvelope } from './executionScopeTypes';
import { getScopeMetricsSnapshot } from './scopeMetrics';

export function logScopeViolation(params: {
  intent: string;
  scope_class: string;
  plan_id: string;
  resourceKey: string;
  operation: string;
  reason: string;
  envelope: ExecutionScopeEnvelope;
}): void {
  logWorkspaceAudit({
    intent: params.intent,
    scope_class: params.scope_class,
    policy_decision: 'deny',
    failure_mode: 'scope_violation',
    detail: {
      plan_id: params.plan_id,
      resourceKey: params.resourceKey,
      operation: params.operation,
      reason: params.reason,
      scope_metrics: getScopeMetricsSnapshot(),
      scope_snapshot: {
        review_files: params.envelope.scope.review_files,
        modify_files: params.envelope.scope.modify_files,
        protected_files: params.envelope.scope.protected_files,
      },
    },
  });
}

export function logScopeAllow(params: {
  intent: string;
  scope_class: string;
  plan_id: string;
  resourceKey: string;
  operation: string;
}): void {
  logWorkspaceAudit({
    intent: params.intent,
    scope_class: params.scope_class,
    policy_decision: 'allow',
    detail: {
      scope_check: 'pass',
      plan_id: params.plan_id,
      resourceKey: params.resourceKey,
      operation: params.operation,
      scope_metrics: getScopeMetricsSnapshot(),
    },
  });
}
