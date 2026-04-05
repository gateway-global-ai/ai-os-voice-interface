/**
 * Canonical logical resource keys for Workspace MCP scope (SPEC-010 virtual paths).
 * @license SPDX-License-Identifier: Apache-2.0
 */

export function gmailThreadKey(threadId: string): string {
  return `gmail:thread:${threadId.trim()}`;
}

export function gmailMessageKey(messageId: string): string {
  return `gmail:message:${messageId.trim()}`;
}

/** Google Calendar — `list_calendars` MCP call (bounded list, no event bodies). */
export const GCAL_LIST_CALENDARS_KEY = 'gcal:list:calendars';

export function gcalEventKey(eventId: string): string {
  return `gcal:event:${eventId.trim()}`;
}

/** Bounded window for `get_events` list (calendar + RFC3339 bounds). */
export function gcalEventsWindowKey(calendarId: string, timeMin: string, timeMax: string): string {
  return `gcal:events:${calendarId.trim()}:${timeMin.trim()}:${timeMax.trim()}`;
}
