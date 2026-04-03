/**
 * Single governed entry for Workspace operations (AIOS-SPEC-007 §2.1).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { WorkspaceRoutingEnvelope, WorkspaceControlPlaneResult } from './types';
import { resolveScopeClass } from './scopeClasses';
import { isPhase1WorkspaceIntent } from './intentRegistry';
import { canExecuteScopeClass } from './workspacePolicy';
import { callWorkspaceMcpAdapter } from './mcpAdapter';
import { logWorkspaceAudit } from './workspaceAudit';
import { newWorkspaceAuditId } from './auditIds';

function validateEnvelope(envelope: WorkspaceRoutingEnvelope): string | null {
  const scope = resolveScopeClass(envelope.intent);
  if (!scope) {
    return `Unknown or unregistered intent: ${envelope.intent}`;
  }
  if (scope !== envelope.policy_context.scope_class) {
    return `policy_context.scope_class (${envelope.policy_context.scope_class}) must match resolved scope (${scope}) for intent ${envelope.intent}`;
  }
  if (!isPhase1WorkspaceIntent(envelope.intent)) {
    return `Intent ${envelope.intent} is not in Phase 1 allowlist`;
  }
  return null;
}

/**
 * Execute a governed Workspace call: policy → adapter. UI shell may skip calling this until MCP is configured.
 */
export async function runWorkspaceControlPlane(
  envelope: WorkspaceRoutingEnvelope,
  options?: {
    surfaceMode?: 'public' | 'founder' | 'operator' | 'customer';
    signal?: AbortSignal;
  }
): Promise<WorkspaceControlPlaneResult> {
  const auditId = newWorkspaceAuditId();
  const err = validateEnvelope(envelope);
  if (err) {
    logWorkspaceAudit({
      intent: envelope.intent,
      scope_class: envelope.policy_context.scope_class,
      policy_decision: 'deny',
      failure_mode: 'invalid_envelope',
      detail: { message: err, auditId },
    });
    return { ok: false, code: 'invalid_intent', message: err, auditId };
  }

  const scope = resolveScopeClass(envelope.intent)!;
  const policy = canExecuteScopeClass(scope, options?.surfaceMode ?? 'founder');
  if (!policy.allowed) {
    logWorkspaceAudit({
      intent: envelope.intent,
      scope_class: scope,
      tenant_id: envelope.tenant_id,
      user_binding: envelope.user_binding,
      policy_decision: 'deny',
      detail: { reason: policy.reason, auditId },
    });
    return { ok: false, code: 'policy_denied', message: policy.reason ?? 'Policy denied', auditId };
  }

  logWorkspaceAudit({
    intent: envelope.intent,
    scope_class: scope,
    tenant_id: envelope.tenant_id,
    user_binding: envelope.user_binding,
    policy_decision: 'allow',
    execution_mode: envelope.execution_mode,
    proposed_vs_executed: envelope.execution_mode === 'execute' ? 'executed' : 'proposed',
    detail: { auditId },
  });

  const adapter = await callWorkspaceMcpAdapter({
    tool: envelope.intent,
    args: {
      resource_ref: envelope.resource_ref,
      session_id: envelope.session_id,
      ...(envelope.query !== undefined ? { query: envelope.query } : {}),
    },
    signal: options?.signal,
  });

  if (!adapter.ok) {
    logWorkspaceAudit({
      intent: envelope.intent,
      scope_class: scope,
      policy_decision: 'allow',
      failure_mode: adapter.code,
      detail: { message: adapter.message, auditId },
    });
    return {
      ok: false,
      code: adapter.code === 'not_configured' ? 'not_configured' : 'adapter_error',
      message: adapter.message,
      auditId,
      adapterCode: adapter.code,
    };
  }

  logWorkspaceAudit({
    intent: envelope.intent,
    scope_class: scope,
    tenant_id: envelope.tenant_id,
    user_binding: envelope.user_binding,
    policy_decision: 'allow',
    detail: { auditId, outcome: 'adapter_success' },
  });

  return { ok: true, data: adapter.data, auditId };
}
