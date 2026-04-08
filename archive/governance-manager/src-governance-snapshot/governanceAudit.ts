/**
 * Client-side governance canvas audit trail (dev console + in-memory buffer).
 * Frozen taxonomy — expand only with an explicit migration.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type GovernanceAuditEventType =
  | 'intent_parsed'
  | 'intent_fallback_used'
  | 'shell_authority_denied'
  | 'shell_intent_unrecognized'
  | 'view_opened'
  | 'policy_denied'
  | 'view_closed'
  | 'backdrop_dismiss'
  | 'workspace_control_plane';

export type GovernanceAuditEvent = {
  ts: number;
  type: GovernanceAuditEventType;
  detail?: Record<string, unknown>;
};

const MAX_EVENTS = 200;
const buffer: GovernanceAuditEvent[] = [];

export function logGovernanceAudit(type: GovernanceAuditEventType, detail?: Record<string, unknown>): void {
  const ev: GovernanceAuditEvent = { ts: Date.now(), type, detail };
  buffer.push(ev);
  if (buffer.length > MAX_EVENTS) buffer.shift();
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  if (isDev) {
    console.debug('[governance-audit]', type, detail ?? {});
  }
}

export function getGovernanceAuditSnapshot(): GovernanceAuditEvent[] {
  return [...buffer];
}

export function clearGovernanceAuditBuffer(): void {
  buffer.length = 0;
}

function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `gov-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export { newEventId };
