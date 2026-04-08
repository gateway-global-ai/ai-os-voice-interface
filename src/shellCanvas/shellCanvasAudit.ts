/**
 * Client-side shell canvas audit trail (dev console + in-memory buffer).
 * Frozen taxonomy — expand only with an explicit migration.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type ShellCanvasAuditEventType =
  | 'intent_parsed'
  | 'intent_fallback_used'
  | 'shell_authority_denied'
  | 'shell_intent_unrecognized'
  | 'view_opened'
  | 'policy_denied'
  | 'view_closed'
  | 'backdrop_dismiss'
  | 'workspace_control_plane';

export type ShellCanvasAuditEvent = {
  ts: number;
  type: ShellCanvasAuditEventType;
  detail?: Record<string, unknown>;
};

const MAX_EVENTS = 200;
const buffer: ShellCanvasAuditEvent[] = [];

export function logShellCanvasAudit(
  type: ShellCanvasAuditEventType,
  detail?: Record<string, unknown>
): void {
  const ev: ShellCanvasAuditEvent = { ts: Date.now(), type, detail };
  buffer.push(ev);
  if (buffer.length > MAX_EVENTS) buffer.shift();
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  if (isDev) {
    console.debug('[shell-canvas]', type, detail ?? {});
  }
}

export function getShellCanvasAuditSnapshot(): ShellCanvasAuditEvent[] {
  return [...buffer];
}

export function clearShellCanvasAuditBuffer(): void {
  buffer.length = 0;
}

function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export { newEventId };
