/**
 * Builds ExecutionScopeEnvelope instances for governed Workspace flows (AIOS-SPEC-010).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { ExecutionScopeEnvelope } from './executionScopeTypes';
import {
  GCAL_LIST_CALENDARS_KEY,
  gcalEventKey,
  gcalEventsWindowKey,
  gmailMessageKey,
  gmailThreadKey,
} from './resourceKeys';

export function newScopePlanId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const SPEC_010_DOC = 'AIOS-SPEC-010';

/** Read-only: load Gmail thread content (MCP get_gmail_thread_content). */
export function buildMailThreadReadScope(threadId: string): ExecutionScopeEnvelope {
  const key = gmailThreadKey(threadId);
  return {
    schema_version: '1.0',
    intent_summary: 'Read Gmail thread content for display or downstream interpretation.',
    plan_id: newScopePlanId(),
    scope_confidence: 'high',
    scope_rationale: [
      'Single-thread read; no repository or corpus expansion.',
      'Thread id supplied by user selection in governed mail UI.',
    ],
    scope: {
      review_files: [key],
      modify_files: [],
      protected_files: [],
      governing_docs: [SPEC_010_DOC],
      verification_targets: [],
    },
  };
}

/** Thread summarize: MCP read + local LLM; same read surface as thread read. */
export function buildMailThreadSummarizeScope(threadId: string): ExecutionScopeEnvelope {
  const key = gmailThreadKey(threadId);
  return {
    schema_version: '1.0',
    intent_summary:
      'Summarize one Gmail thread: MCP retrieval bounded to thread, then local LLM interpretation.',
    plan_id: newScopePlanId(),
    scope_confidence: 'high',
    scope_rationale: [
      'Model context is limited to MCP-returned thread payload (bounded in threadSummarize).',
      'No mailbox-wide or repo-wide retrieval.',
    ],
    scope: {
      review_files: [key],
      modify_files: [],
      protected_files: [],
      governing_docs: [SPEC_010_DOC],
      verification_targets: [],
    },
  };
}

/** List calendars (MCP `list_calendars`) — read-only, fixed logical key. */
export function buildCalendarListScope(): ExecutionScopeEnvelope {
  return {
    schema_version: '1.0',
    intent_summary: 'List Google calendars visible to the connected account (read-only).',
    plan_id: newScopePlanId(),
    scope_confidence: 'high',
    scope_rationale: [
      'Single list operation; no event expansion or cross-product scope.',
      'Hub load path in workspace_calendar_hub.',
    ],
    scope: {
      review_files: [GCAL_LIST_CALENDARS_KEY],
      modify_files: [],
      protected_files: [],
      governing_docs: [SPEC_010_DOC],
      verification_targets: [],
    },
  };
}

/** List events in a time window (MCP `get_events` without `event_id`). */
export function buildCalendarEventsListScope(
  calendarId: string,
  timeMin: string,
  timeMax: string,
): ExecutionScopeEnvelope {
  const key = gcalEventsWindowKey(calendarId, timeMin, timeMax);
  return {
    schema_version: '1.0',
    intent_summary: `List calendar events in a bounded time range (${calendarId}).`,
    plan_id: newScopePlanId(),
    scope_confidence: 'high',
    scope_rationale: [
      'Time-bounded query only; max_results capped in MCP mapping.',
      `Window ${timeMin} → ${timeMax}.`,
    ],
    scope: {
      review_files: [key],
      modify_files: [],
      protected_files: [],
      governing_docs: [SPEC_010_DOC],
      verification_targets: [],
    },
  };
}

/** Read one calendar event (MCP `get_events` with event_id). */
export function buildCalendarGetScope(eventId: string, calendarIdForRead = 'primary'): ExecutionScopeEnvelope {
  const key = gcalEventKey(eventId);
  const cal = calendarIdForRead.trim() || 'primary';
  return {
    schema_version: '1.0',
    intent_summary: `Read a single calendar event (calendar ${cal}).`,
    plan_id: newScopePlanId(),
    scope_confidence: 'high',
    scope_rationale: [
      'Event chosen from UI list or known id; scoped to one event resource.',
      cal !== 'primary' ? `Calendar: ${cal}` : 'Primary calendar.',
    ],
    scope: {
      review_files: [key],
      modify_files: [],
      protected_files: [],
      governing_docs: [SPEC_010_DOC],
      verification_targets: [],
    },
  };
}

/** Draft reply: write path for reply target message (draft_gmail_message). */
export function buildMailDraftReplyScope(messageId: string, threadId?: string): ExecutionScopeEnvelope {
  const msgKey = gmailMessageKey(messageId);
  const review: string[] = [msgKey];
  if (threadId?.trim()) {
    review.push(gmailThreadKey(threadId));
  }
  return {
    schema_version: '1.0',
    intent_summary: 'Create a Gmail draft reply to a specific message (draft plane).',
    plan_id: newScopePlanId(),
    scope_confidence: 'high',
    scope_rationale: [
      'Draft is scoped to the selected message and optional thread context.',
      'No send or automation outside draft tool.',
    ],
    scope: {
      review_files: review,
      modify_files: [msgKey],
      protected_files: [],
      governing_docs: [SPEC_010_DOC],
      verification_targets: [],
    },
  };
}
