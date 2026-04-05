/**
 * Normalize Gmail / MCP search payloads into typed rows for governed primary UI (click-through read).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { extractMcpRowArray } from './workspaceMcpDisplay';

/** One message line item suitable for selection-driven `workspace.mail.read`. */
export type MailSearchRow = {
  messageId: string;
  threadId?: string;
  from?: string;
  subject?: string;
  snippet?: string;
  /** Display string (already formatted when possible). */
  date?: string;
  unread?: boolean;
  labels?: string[];
};

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function pickLabels(o: Record<string, unknown>): string[] | undefined {
  const raw = o.labelIds ?? o.labels;
  if (!Array.isArray(raw)) return undefined;
  const labels = raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
  return labels.length ? labels : undefined;
}

function formatMaybeDate(o: Record<string, unknown>): string | undefined {
  const internal = o.internalDate;
  if (typeof internal === 'string' && /^\d+$/.test(internal)) {
    const n = Number(internal);
    if (!Number.isNaN(n)) {
      try {
        return new Date(n).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
      } catch {
        /* ignore */
      }
    }
  }
  if (typeof internal === 'number' && Number.isFinite(internal)) {
    try {
      return new Date(internal).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      /* ignore */
    }
  }
  const d = pickString(o, ['date', 'sentAt', 'receivedAt', 'internalDateFormatted']);
  return d;
}

function fromHeaderOrField(o: Record<string, unknown>): string | undefined {
  const direct = pickString(o, ['from', 'From', 'sender', 'senderEmail', 'fromEmail']);
  if (direct) return direct;
  const sender = o.sender;
  if (sender != null && typeof sender === 'object') {
    const s = sender as Record<string, unknown>;
    const name = typeof s.name === 'string' ? s.name.trim() : '';
    const addr = typeof s.email === 'string' ? s.email.trim() : typeof s.emailAddress === 'string' ? s.emailAddress.trim() : '';
    if (name && addr) return `${name} <${addr}>`;
    if (addr) return addr;
    if (name) return name;
  }
  const headers = o.headers;
  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (h == null || typeof h !== 'object') continue;
      const ho = h as Record<string, unknown>;
      const name = typeof ho.name === 'string' ? ho.name.toLowerCase() : '';
      if (name === 'from' && typeof ho.value === 'string') return ho.value.trim();
    }
  }
  return undefined;
}

function inferUnread(o: Record<string, unknown>, labels?: string[]): boolean | undefined {
  if (typeof o.unread === 'boolean') return o.unread;
  if (labels?.includes('UNREAD')) return true;
  return undefined;
}

function looksLikeGmailMessageRecord(o: Record<string, unknown>): boolean {
  if (pickString(o, ['threadId', 'thread_id'])) return true;
  if (Array.isArray(o.labelIds) && o.labelIds.length > 0) return true;
  if (o.internalDate !== undefined) return true;
  if (o.payload != null && typeof o.payload === 'object') return true;
  return false;
}

function rowFromObject(o: Record<string, unknown>): MailSearchRow | null {
  const messageId = pickString(o, ['id', 'messageId', 'message_id', 'rfc822Id', 'message_id_str']);
  if (!messageId) return null;
  /** Avoid treating bare thread summaries (`{ id, snippet }`) as message ids — Gmail thread id != message id. */
  if (!looksLikeGmailMessageRecord(o) && !Array.isArray(o.messages)) {
    return null;
  }
  const labels = pickLabels(o);
  const subject = pickString(o, ['subject', 'Subject', 'title']);
  const snippet = pickString(o, ['snippet', 'preview', 'summary', 'bodyPreview']);
  return {
    messageId,
    threadId: pickString(o, ['threadId', 'thread_id']),
    from: fromHeaderOrField(o),
    subject,
    snippet,
    date: formatMaybeDate(o),
    unread: inferUnread(o, labels),
    labels,
  };
}

function rowsFromUnknownItem(item: unknown): MailSearchRow[] {
  if (item == null) return [];
  if (typeof item === 'string') return [];
  if (typeof item !== 'object') return [];
  const o = item as Record<string, unknown>;

  if (Array.isArray(o.messages)) {
    return o.messages.flatMap((m) => rowsFromUnknownItem(m));
  }

  const single = rowFromObject(o);
  if (single) return [single];

  const nested = o.message ?? o.data ?? o.payload;
  if (nested != null && typeof nested === 'object') {
    return rowsFromUnknownItem(nested);
  }
  return [];
}

function mergeRows(a: MailSearchRow, b: MailSearchRow): MailSearchRow {
  return {
    messageId: a.messageId,
    threadId: a.threadId ?? b.threadId,
    from: a.from ?? b.from,
    subject: a.subject ?? b.subject,
    snippet: a.snippet ?? b.snippet,
    date: a.date ?? b.date,
    unread: a.unread ?? b.unread,
    labels: a.labels ?? b.labels,
  };
}

/**
 * Unwrap common MCP / JSON-RPC tool envelopes (`result`, `data`, …) so list extraction sees `{ messages: [...] }`.
 * Shallow-chains up to a few levels to match typical `tools/call` wrappers.
 */
export function unwrapMailSearchPayload(data: unknown): unknown {
  let cur: unknown = data;
  for (let depth = 0; depth < 5; depth++) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) break;
    const o = cur as Record<string, unknown>;
    let next: unknown;
    next = undefined;
    for (const k of ['result', 'data', 'content', 'output']) {
      const v = o[k];
      if (v != null && typeof v === 'object') {
        next = v;
        break;
      }
    }
    if (next === undefined) break;
    cur = next;
  }
  return cur;
}

/**
 * Flatten MCP search payload into deduplicated, typed message rows (best-effort across API shapes).
 */
export function normalizeMailSearchRows(data: unknown): MailSearchRow[] {
  const unwrapped = unwrapMailSearchPayload(data);
  const raw = extractMcpRowArray(unwrapped);
  const list = raw ?? (Array.isArray(unwrapped) ? unwrapped : null);
  if (!list) return [];

  const acc: MailSearchRow[] = [];
  for (const item of list) {
    acc.push(...rowsFromUnknownItem(item));
  }

  const byId = new Map<string, MailSearchRow>();
  for (const row of acc) {
    const prev = byId.get(row.messageId);
    byId.set(row.messageId, prev ? mergeRows(prev, row) : row);
  }
  return Array.from(byId.values());
}

export function mailSearchRowsHaveClickTargets(rows: MailSearchRow[]): boolean {
  return rows.some((r) => typeof r.messageId === 'string' && r.messageId.length > 0);
}
