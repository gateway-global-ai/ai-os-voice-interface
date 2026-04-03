/**
 * Google Workspace governed integration — public exports (AIOS-SPEC-007).
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type { WorkspaceRoutingEnvelope, WorkspaceScopeClass, WorkspaceControlPlaneResult } from './types';
export { runWorkspaceControlPlane } from './integrationControlPlane';
export { resolveScopeClass, INTENT_TO_SCOPE_CLASS, WORKSPACE_SCOPE_CLASSES } from './scopeClasses';
export { PHASE_1_WORKSPACE_INTENTS, isPhase1WorkspaceIntent } from './intentRegistry';
export { workspaceIntentToCanvasView, type ParsedWorkspaceIntent } from './workspaceIntentRouter';
export { logWorkspaceAudit } from './workspaceAudit';
export { callWorkspaceMcpAdapter } from './mcpAdapter';
