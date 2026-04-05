/**
 * Human-readable formatting for MCP tool payloads (strings with \\r\\n, JSON, lists).
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** Normalize line endings for display. */
export function normalizeMcpText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Best-effort extraction of Gmail message ids from MCP search text (e.g. "Message ID: abc…").
 */
export function extractGmailMessageIdsFromSearchText(text: string): string[] {
  const ids: string[] = [];
  const re = /Message\s*ID:\s*([^\s\r\n]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const id = m[1]?.trim();
    if (id) ids.push(id);
  }
  return [...new Set(ids)];
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** Walk MCP JSON for Gmail `threadId` / `thread_id` (thread content tools). */
export function extractGmailThreadIdFromPayload(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const tid = pickString(o, ['threadId', 'thread_id']);
    if (tid) return tid;
    for (const v of Object.values(o)) {
      const found = extractGmailThreadIdFromPayload(v);
      if (found) return found;
    }
  }
  if (Array.isArray(data)) {
    for (const x of data) {
      const found = extractGmailThreadIdFromPayload(x);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Best-effort Gmail message id from `get_gmail_message_content` payload (object with `id` + `threadId` / `payload`).
 */
export function extractGmailMessageIdFromPayload(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const id = pickString(o, ['id', 'messageId', 'message_id']);
    const hasThread = pickString(o, ['threadId', 'thread_id']);
    const hasPayload = o.payload != null && typeof o.payload === 'object';
    if (id && (hasThread || hasPayload)) return id;
    for (const v of Object.values(o)) {
      const found = extractGmailMessageIdFromPayload(v);
      if (found) return found;
    }
  }
  if (Array.isArray(data)) {
    for (const x of data) {
      const found = extractGmailMessageIdFromPayload(x);
      if (found) return found;
    }
  }
  return undefined;
}

/** Try to show a title line for JSON array items (calendars, messages, files). */
export function summarizeMcpRow(item: unknown, index: number): string {
  if (item == null) return `Item ${index + 1}`;
  if (typeof item === 'string') return item.slice(0, 120) + (item.length > 120 ? '…' : '');
  if (typeof item !== 'object') return String(item);
  const o = item as Record<string, unknown>;
  const title =
    pickString(o, ['summary', 'name', 'subject', 'title', 'fileName', 'displayName']) ??
    pickString(o, ['id', 'messageId', 'fileId']);
  return title ?? `Item ${index + 1}`;
}

/** Whether payload looks like an array of records worth listing. */
export function mcpDataLooksLikeRowList(data: unknown): boolean {
  if (!Array.isArray(data)) return false;
  return data.length > 0 && data.every((x) => x != null && typeof x === 'object' && !Array.isArray(x));
}

/** Common shapes: { calendars: [] }, { messages: [] }, { items: [] }, { files: [] } */
export function extractMcpRowArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data != null && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const k of ['calendars', 'messages', 'threads', 'items', 'files', 'results', 'contacts']) {
      const v = o[k];
      if (Array.isArray(v)) return v;
    }
  }
  return null;
}

/** Best-effort count of list-like results for disclosure (POL-INTENT-005). */
export function estimateMcpResultCount(data: unknown): number | undefined {
  const rows = extractMcpRowArray(data);
  if (rows) return rows.length;
  if (Array.isArray(data)) return data.length;
  return undefined;
}
