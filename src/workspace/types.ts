/**
 * Google Workspace integration — routing types (AIOS-SPEC-007).
 * Layer 2 intent → exactly one Layer 1 scope class (see scopeClasses.ts).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { ExecutionScopeEnvelope } from '../scope/executionScopeTypes';

/** Layer 1 — canonical policy scope classes (risk / capability). */
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

/**
 * For `workspace.mail.read`, use e.g. `{ type: 'message', id }` so the adapter forwards `id` in tool args.
 * For `workspace.mail.draft_reply`, include `threadId` when known so the MCP server can thread the draft.
 */
export type WorkspaceResourceRef = {
  type: string;
  id?: string;
  /** Gmail thread id (optional; used by draft/reply tools when distinct from `id`). */
  threadId?: string;
  /**
   * Google Calendar id (e.g. `primary` or `foo@group.calendar.google.com`) for `get_events` / event list.
   * Optional; defaults to `primary` in MCP mapping when omitted.
   */
  calendarId?: string;
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
  /**
   * For `workspace.mail.search` only: forwarded to MCP tool `arguments.query` (not `resource_ref`).
   * Omit for other intents. Empty string is valid if the MCP tool defines a default listing.
   */
  query?: string;
  /**
   * AIOS-SPEC-010: when set, `runWorkspaceControlPlane` validates the resolved MCP operation
   * against this envelope before calling the adapter.
   */
  execution_scope?: ExecutionScopeEnvelope;
  /**
   * `workspace.calendar.events.list` — RFC3339 window (inclusive start, exclusive end per API usage).
   * Required for that intent.
   */
  calendar_time_range?: { time_min: string; time_max: string };
  /**
   * `workspace.contacts.list` — People API `connections.list` pagination (`page_token` in MCP tool args).
   */
  contacts_page_token?: string;
};

export type WorkspaceControlPlaneResult<T = unknown> =
  | { ok: true; data: T; auditId: string }
  | {
      ok: false;
      code:
        | 'policy_denied'
        | 'invalid_intent'
        | 'adapter_error'
        | 'not_configured'
        | 'auth_required'
        | 'scope_denied';
      message: string;
      auditId: string;
      /** Set when code is `adapter_error` — original MCP adapter failure class. */
      adapterCode?: 'not_configured' | 'timeout' | 'aborted' | 'http_error' | 'auth_error';
    };
