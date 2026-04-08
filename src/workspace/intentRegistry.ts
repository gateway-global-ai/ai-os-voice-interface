/**
 * Phase 1 — read plane only (AIOS-SPEC-007 §12). Extend later phases in separate commits.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export const PHASE_1_WORKSPACE_INTENTS = [
  'workspace.hub',
  'workspace.calendar.list',
  /** List events in a time window (`get_events` without `event_id`). */
  'workspace.calendar.events.list',
  'workspace.calendar.get',
  'workspace.mail.search',
  'workspace.mail.read',
  /** Full thread text (extended MCP tool — get_gmail_thread_content). */
  'workspace.mail.thread.read',
  /** MCP thread read + local.llm.summarize (read plane; governed fallback). */
  'workspace.mail.thread.summarize',
  /** Create a Gmail draft reply (draft plane; proposal-gated). */
  'workspace.mail.draft_reply',
  /** Default Drive hub load — list/search files (empty query = recent / default list per MCP). */
  'workspace.drive.list',
  'workspace.drive.search',
  'workspace.drive.read',
  'workspace.docs.read',
  'workspace.docs.export',
  /** List connections (`list_contacts`) — use for hub default load. */
  'workspace.contacts.list',
  'workspace.contacts.search',
  'workspace.tasks.list',
  'workspace.tasks.get',
  /** Google Custom Search (PSE) — requires GOOGLE_PSE_* on MCP host. */
  'workspace.web.search',
] as const;

export type Phase1WorkspaceIntent = (typeof PHASE_1_WORKSPACE_INTENTS)[number];

export function isPhase1WorkspaceIntent(s: string): s is Phase1WorkspaceIntent {
  return (PHASE_1_WORKSPACE_INTENTS as readonly string[]).includes(s);
}
