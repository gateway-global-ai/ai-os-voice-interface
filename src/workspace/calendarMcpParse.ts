/**
 * Parse MCP calendar list / event list text for intent-driven UI (no manual id paste).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { extractMcpRowArray } from './workspaceMcpDisplay';

/** From `list_calendars` prose: `- "Title" (ID: x)` or `(Primary) (ID: x)`. */
export function parseCalendarMcpListCalendars(text: string): { summary: string; id: string }[] {
  const out: { summary: string; id: string }[] = [];
  if (!text || typeof text !== 'string') return out;
  const re = /-\s*"([^"]+)"\s*(?:\(Primary\)\s*)?\(ID:\s*([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ summary: m[1].trim(), id: m[2].trim() });
  }
  return out;
}

/**
 * From `get_events` formatted string — lines with `ID: xxx | Link:`.
 */
export function parseCalendarEventRowsFromGetEventsText(text: string): { summary: string; id: string }[] {
  const out: { summary: string; id: string }[] = [];
  if (!text || typeof text !== 'string') return out;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const titleMatch = line.match(/^-\s*"([^"]+)"/);
    const idMatch = line.match(/ID:\s*([^\s|]+)\s*\|/);
    if (idMatch?.[1]) {
      out.push({
        summary: titleMatch?.[1]?.trim() ?? 'Event',
        id: idMatch[1].trim(),
      });
    }
  }
  return out;
}

function calendarsFromJsonRows(data: unknown): { summary: string; id: string }[] {
  const rows = extractMcpRowArray(data);
  if (!rows?.length) return [];
  const out: { summary: string; id: string }[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== 'object' || Array.isArray(r)) continue;
    const o = r as Record<string, unknown>;
    const id =
      typeof o.id === 'string'
        ? o.id
        : typeof o.calendarId === 'string'
          ? o.calendarId
          : typeof o.calendar_id === 'string'
            ? o.calendar_id
            : '';
    if (!id) continue;
    const summary =
      typeof o.summary === 'string'
        ? o.summary
        : typeof o.name === 'string'
          ? o.name
          : typeof o.title === 'string'
            ? o.title
            : id;
    out.push({ summary, id });
  }
  return out;
}

/**
 * Normalize calendar directory from MCP payload (JSON object/array or formatted string).
 */
export function normalizeCalendarListFromMcpPayload(data: unknown): { summary: string; id: string }[] {
  const fromJson = calendarsFromJsonRows(data);
  if (fromJson.length > 0) return fromJson;
  if (typeof data === 'string') return parseCalendarMcpListCalendars(data);
  if (data == null) return [];
  return parseCalendarMcpListCalendars(String(data));
}
