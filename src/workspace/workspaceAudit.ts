/**
 * Audit trail for Workspace control plane (extends governance audit patterns).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { logGovernanceAudit } from '../governance/governanceAudit';

export type WorkspaceAuditPayload = {
  intent: string;
  scope_class: string;
  tenant_id?: string;
  user_binding?: string;
  tool?: string;
  policy_decision: 'allow' | 'deny';
  execution_mode?: string;
  proposed_vs_executed?: 'proposed' | 'executed';
  failure_mode?: string;
  detail?: Record<string, unknown>;
};

export function logWorkspaceAudit(payload: WorkspaceAuditPayload): void {
  logGovernanceAudit('workspace_control_plane', {
    subsystem: 'google_workspace',
    ...payload,
  });
}
