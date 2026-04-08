/**
 * Workspace MCP gate states for disclosure and routing (AIOS-SPEC-009 §12.2, SPEC-007).
 * **Core** type — no workspace adapter imports (AIOS-ADR-001).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type WorkspaceState =
  | 'unknown'
  | 'not_configured'
  | 'connecting'
  /** GIS or env bearer present — MCP `tools/call` can authenticate. */
  | 'connected'
  /** User opted in + MCP URL set, but no GIS/env bearer. */
  | 'auth_required'
  | 'error';
