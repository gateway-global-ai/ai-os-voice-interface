/**
 * Single governed entry for Workspace operations (AIOS-SPEC-007 §2 *Normative routing model*, item 1 — Intent Router → ICP → MCP Adapter).
 *
 * **Intent vs MCP tool:** Policy and audits use **`envelope.intent`** (`workspace.mail.search`, …).
 * **`resolveWorkspaceMcpToolCall`** maps to the server’s tool names (`search_gmail_messages`, …);
 * **`callWorkspaceMcpAdapter`** receives the mapped name only.
 *
 * **OAuth 2.1:** **`getSessionGoogleAccessToken()`** (GIS sign-in) or **`getWorkspaceMcpBearerTokenFromEnv()`** (**`VITE_WORKSPACE_MCP_BEARER_TOKEN`**, dev) → **`Authorization: Bearer`** on initialize + tools/call.
 *
 * **ICP boundary:** Policy + audit + `callWorkspaceMcpAdapter`. MCP **transport** session
 * (`initialize` / `Mcp-Session-Id`) is not the same as `envelope.session_id` (audit correlation).
 * FastMCP streamable HTTP needs the former; see **`mcpAdapter.ts`** header and **WORKSPACE.md**.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { WorkspaceRoutingEnvelope, WorkspaceControlPlaneResult } from './types';
import { resolveScopeClass } from './scopeClasses';
import { isPhase1WorkspaceIntent } from './intentRegistry';
import { canExecuteScopeClass } from './workspacePolicy';
import { callWorkspaceMcpAdapter, getWorkspaceMcpBearerTokenFromEnv } from './mcpAdapter';
import { getSessionGoogleAccessToken } from './workspaceSessionAuth';
import { resolveWorkspaceMcpToolCall } from './mcpIntentToolMap';
import { logWorkspaceAudit } from './workspaceAudit';
import { newWorkspaceAuditId } from './auditIds';
import { logScopeAllow, logScopeViolation } from '../scope/scopeAudit';
import { routingEnvelopeToScopeTarget } from '../scope/scopeRouting';
import { validateScopeOperation } from '../scope/validateScope';
import { getScopeMetricsSnapshot, recordScopeCheck } from '../scope/scopeMetrics';

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

  const resolved = resolveWorkspaceMcpToolCall(envelope);
  if (resolved.ok === false) {
    const missingEmail =
      resolved.message.includes('VITE_AIOS_GOOGLE_USER_EMAIL') ||
      resolved.message.includes('VITE_WORKSPACE_GOOGLE_USER_EMAIL') ||
      resolved.message.includes('VITE_WORKSPACE_MCP_INCLUDE_USER_EMAIL');
    logWorkspaceAudit({
      intent: envelope.intent,
      scope_class: scope,
      policy_decision: 'allow',
      failure_mode: missingEmail ? 'not_configured' : 'invalid_envelope',
      detail: { message: resolved.message, auditId },
    });
    return {
      ok: false,
      code: missingEmail ? 'not_configured' : 'invalid_intent',
      message: resolved.message,
      auditId,
    };
  }

  if (envelope.execution_scope) {
    const target = routingEnvelopeToScopeTarget(envelope);
    if (target.ok === false) {
      logWorkspaceAudit({
        intent: envelope.intent,
        scope_class: scope,
        policy_decision: 'deny',
        failure_mode: 'scope_routing_invalid',
        detail: { message: target.message, auditId, scope_metrics: getScopeMetricsSnapshot() },
      });
      return {
        ok: false,
        code: 'scope_denied',
        message: target.message,
        auditId,
      };
    }
    const scopeCheck = validateScopeOperation({
      operation: target.operation,
      resourceKey: target.resourceKey,
      envelope: envelope.execution_scope,
    });
    if (!scopeCheck.allowed) {
      const reason = scopeCheck.reason ?? 'unknown';
      recordScopeCheck('denied');
      logScopeViolation({
        intent: envelope.intent,
        scope_class: scope,
        plan_id: envelope.execution_scope.plan_id,
        resourceKey: target.resourceKey,
        operation: target.operation,
        reason,
        envelope: envelope.execution_scope,
      });
      return {
        ok: false,
        code: 'scope_denied',
        message: `Execution scope denied: ${reason}`,
        auditId,
      };
    }
    recordScopeCheck('allowed');
    logScopeAllow({
      intent: envelope.intent,
      scope_class: scope,
      plan_id: envelope.execution_scope.plan_id,
      resourceKey: target.resourceKey,
      operation: target.operation,
    });
  }

  const bearerToken = getSessionGoogleAccessToken() ?? getWorkspaceMcpBearerTokenFromEnv();

  if (!bearerToken?.trim()) {
    logWorkspaceAudit({
      intent: envelope.intent,
      scope_class: scope,
      policy_decision: 'allow',
      failure_mode: 'auth_required',
      detail: {
        message: 'No Google access token for MCP OAuth 2.1 (Sign in with Google or env bearer).',
        auditId,
      },
    });
    return {
      ok: false,
      code: 'auth_required',
      message:
        'No Google access token for Workspace MCP. Click Sign in with Google at the top of this panel, complete the Google prompt, then open Calendar or Mail again. For dev without GIS, set VITE_WORKSPACE_MCP_BEARER_TOKEN in .env.local and restart the dev server.',
      auditId,
    };
  }

  const adapterResult = await callWorkspaceMcpAdapter({
    tool: resolved.tool,
    args: resolved.args,
    bearerToken,
    signal: options?.signal,
  });

  if (adapterResult.ok === false) {
    const { code, message } = adapterResult;
    logWorkspaceAudit({
      intent: envelope.intent,
      tool: resolved.tool,
      scope_class: scope,
      policy_decision: 'allow',
      failure_mode: code,
      detail: { message, auditId },
    });
    return {
      ok: false,
      code: code === 'not_configured' ? 'not_configured' : 'adapter_error',
      message,
      auditId,
      adapterCode: code,
    };
  }

  logWorkspaceAudit({
    intent: envelope.intent,
    tool: resolved.tool,
    scope_class: scope,
    tenant_id: envelope.tenant_id,
    user_binding: envelope.user_binding,
    policy_decision: 'allow',
    detail: { auditId, outcome: 'adapter_success' },
  });

  return { ok: true, data: adapterResult.data, auditId };
}
