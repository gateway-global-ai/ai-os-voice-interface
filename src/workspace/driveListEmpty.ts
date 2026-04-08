/**
 * Permissive empty check for Drive list/search MCP payloads (shapes vary by server).
 * Read-plane only — do not use for write responses.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export function workspaceDriveListDataIsEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (typeof data === 'string') return data.trim().length === 0;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.files)) return o.files.length === 0;
    if (Array.isArray(o.fileList)) return o.fileList.length === 0;
    if (Array.isArray(o.items)) return o.items.length === 0;
    if (Array.isArray(o.messages)) return o.messages.length === 0;
    if (o.data != null && typeof o.data === 'object') {
      const d = o.data as Record<string, unknown>;
      if (Array.isArray(d.files)) return d.files.length === 0;
    }
  }
  return false;
}
