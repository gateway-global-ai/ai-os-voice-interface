/** @license SPDX-License-Identifier: Apache-2.0 */

export function newWorkspaceAuditId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
