/**
 * Google Workspace governed integration — routing types (AIOS-SPEC-007).
 * Layer 2 intent → exactly one Layer 1 scope class (see scopeClasses.ts).
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** Layer 1 — canonical governance scope classes (policy / risk). */
export type WorkspaceScopeClass =
  | 'workspace.google.read'
  | 'workspace.google.write'
  | 'workspace.google.send'
  | 'workspace.google.share'
  | 'workspace.google.automation'
  | 'workspace.google.identity'
  | 'workspace.google.search';

export type WorkspaceExecutionMode = 'observe' | 'prepare' | 'execute' | 'automate';

export type WorkspaceActorType = string;

export type WorkspaceResourceRef = {
  type: string;
  id?: string;
};

export type WorkspacePolicyContext = {
  requires_confirmation?: boolean;
  /** MUST match the single scope class resolved from `intent`. */
  scope_class: WorkspaceScopeClass;
};

/**
 * Routing envelope — required shape before MCP adapter dispatch (SPEC-007 §6).
 */
export type WorkspaceRoutingEnvelope = {
  intent: string;
  actor_type: WorkspaceActorType;
  tenant_id: string;
  user_binding: string;
  execution_mode: WorkspaceExecutionMode;
  resource_ref?: WorkspaceResourceRef;
  policy_context: WorkspacePolicyContext;
  /** Correlation for audit. */
  session_id?: string;
};

export type WorkspaceControlPlaneResult<T = unknown> =
  | { ok: true; data: T; auditId: string }
  | {
      ok: false;
      code: 'policy_denied' | 'invalid_intent' | 'adapter_error' | 'not_configured';
      message: string;
      auditId: string;
    };
