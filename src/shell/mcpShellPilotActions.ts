/**
 * Actions emitted from MCP App guest UIs via experimental JSON-RPC `x/aios/shell_action`.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type ShellPilotAction =
  | { type: 'community_students' }
  | { type: 'community_professors' }
  | { type: 'community_guest_speakers' }
  | { type: 'community_create_account' }
  | { type: 'community_login' }
  | { type: 'community_close' }
  | { type: 'community_back' }
  | { type: 'otp_send'; phone?: string };

export function parseShellPilotAction(raw: unknown): ShellPilotAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.action === 'community_students') return { type: 'community_students' };
  if (o.action === 'community_professors') return { type: 'community_professors' };
  if (o.action === 'community_guest_speakers') return { type: 'community_guest_speakers' };
  if (o.action === 'community_create_account') return { type: 'community_create_account' };
  if (o.action === 'community_login') return { type: 'community_login' };
  if (o.action === 'community_close') return { type: 'community_close' };
  if (o.action === 'community_back') return { type: 'community_back' };
  if (o.action === 'otp_send') return { type: 'otp_send', phone: typeof o.phone === 'string' ? o.phone : undefined };
  return null;
}
