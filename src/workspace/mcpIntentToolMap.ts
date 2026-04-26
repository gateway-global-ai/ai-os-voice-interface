/**
 * Maps AIOS Phase 1 **intent** ids to **[gateway-global-ai/aios_google_workspace_mcp](https://github.com/gateway-global-ai/aios_google_workspace_mcp)** tool names
 * (`list_calendars`, `search_gmail_messages`, …). The MCP server does not register tools under `workspace.*` strings.
 *
 * **OAuth 2.1 / HTTP:** FastMCP exposes tools **without** `user_google_email` in JSON-RPC `arguments` — the account
 * comes from **`Authorization: Bearer`**. Passing `user_google_email` causes Pydantic **unexpected_keyword_argument**.
 *
 * **Legacy single-user** MCP: set **`VITE_WORKSPACE_MCP_INCLUDE_USER_EMAIL=true`** and **`VITE_AIOS_GOOGLE_USER_EMAIL`** so
 * `user_google_email` is sent (older servers that still require it in tool args).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { WorkspaceRoutingEnvelope } from './types';

/** Common copy-paste mistake: `.env` value set to the variable name instead of a real address. */
function isInvalidGoogleEmailPlaceholder(s: string): boolean {
  return s.trim().toLowerCase() === 'vite_workspace_google_user_email';
}

const GOOGLE_EMAIL_ENV_KEYS = ['VITE_AIOS_GOOGLE_USER_EMAIL', 'VITE_WORKSPACE_GOOGLE_USER_EMAIL'] as const;

function readWorkspaceEnv(): Record<string, string | boolean | undefined> {
  return ((import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env ?? {});
}

export function getWorkspaceGoogleUserEmail(): string | null {
  const env = readWorkspaceEnv();
  for (const key of GOOGLE_EMAIL_ENV_KEYS) {
    const v = env[key];
    if (typeof v !== 'string' || !v.trim()) continue;
    const t = v.trim();
    if (isInvalidGoogleEmailPlaceholder(t)) continue;
    return t;
  }
  return null;
}

function includeUserGoogleEmailInMcpArgs(): boolean {
  const v = readWorkspaceEnv().VITE_WORKSPACE_MCP_INCLUDE_USER_EMAIL;
  return typeof v === 'string' && v.trim().toLowerCase() === 'true';
}

export type ResolvedWorkspaceMcpCall =
  | { ok: true; tool: string; args: Record<string, unknown> }
  | { ok: false; message: string };

/**
 * Resolve governed intent → MCP `tools/call` name + arguments expected by the Python server.
 */
export function resolveWorkspaceMcpToolCall(envelope: WorkspaceRoutingEnvelope): ResolvedWorkspaceMcpCall {
  const passEmail = includeUserGoogleEmailInMcpArgs();
  const email = passEmail ? getWorkspaceGoogleUserEmail() : null;
  if (passEmail && !email) {
    return {
      ok: false,
      message:
        'VITE_WORKSPACE_MCP_INCLUDE_USER_EMAIL=true requires VITE_AIOS_GOOGLE_USER_EMAIL (or VITE_WORKSPACE_GOOGLE_USER_EMAIL) for legacy MCP tool args.',
    };
  }

  const userFields: Record<string, unknown> = passEmail && email ? { user_google_email: email } : {};
  const { intent } = envelope;

  switch (intent) {
    case 'workspace.calendar.list':
      return { ok: true, tool: 'list_calendars', args: { ...userFields } };

    case 'workspace.calendar.events.list': {
      const calId = envelope.resource_ref?.id?.trim() || envelope.resource_ref?.calendarId?.trim() || 'primary';
      const tr = envelope.calendar_time_range;
      if (!tr?.time_min?.trim() || !tr?.time_max?.trim()) {
        return {
          ok: false,
          message:
            'workspace.calendar.events.list requires calendar_time_range.time_min and time_max (RFC3339), and resource_ref.id (calendar id, or omit for primary).',
        };
      }
      return {
        ok: true,
        tool: 'get_events',
        args: {
          ...userFields,
          calendar_id: calId,
          time_min: tr.time_min.trim(),
          time_max: tr.time_max.trim(),
          max_results: 50,
        },
      };
    }

    case 'workspace.calendar.get': {
      const eventId = envelope.resource_ref?.id?.trim();
      if (!eventId) {
        return { ok: false, message: 'workspace.calendar.get requires resource_ref.id (calendar event id).' };
      }
      const calendarId = envelope.resource_ref?.calendarId?.trim() || 'primary';
      return {
        ok: true,
        tool: 'get_events',
        args: {
          ...userFields,
          calendar_id: calendarId,
          event_id: eventId,
        },
      };
    }

    case 'workspace.mail.search':
      return {
        ok: true,
        tool: 'search_gmail_messages',
        args: {
          ...userFields,
          query: envelope.query ?? '',
          page_size: 10,
        },
      };

    case 'workspace.mail.read': {
      const mid = envelope.resource_ref?.id?.trim();
      if (!mid) {
        return { ok: false, message: 'workspace.mail.read requires resource_ref.id (Gmail message id).' };
      }
      return {
        ok: true,
        tool: 'get_gmail_message_content',
        args: { ...userFields, message_id: mid },
      };
    }

    /** Extended tier on aios_google_workspace_mcp — align `args` with `gmail/gmail_tools.py` if the server errors. */
    case 'workspace.mail.thread.read': {
      const tid = envelope.resource_ref?.id?.trim();
      if (!tid) {
        return { ok: false, message: 'workspace.mail.thread.read requires resource_ref.id (Gmail thread id).' };
      }
      return {
        ok: true,
        tool: 'get_gmail_thread_content',
        args: { ...userFields, thread_id: tid },
      };
    }

    case 'workspace.mail.draft_reply': {
      const mid = envelope.resource_ref?.id?.trim();
      if (!mid) {
        return { ok: false, message: 'workspace.mail.draft_reply requires resource_ref.id (Gmail message id).' };
      }
      const body = (envelope.query ?? '').trim() || '(empty draft body)';
      const threadId = envelope.resource_ref?.threadId?.trim();
      const args: Record<string, unknown> = {
        ...userFields,
        reply_to_message_id: mid,
        body,
      };
      if (threadId) {
        args.thread_id = threadId;
      }
      return {
        ok: true,
        tool: 'draft_gmail_message',
        args,
      };
    }

    case 'workspace.drive.list':
    case 'workspace.drive.search':
      return {
        ok: true,
        tool: 'search_drive_files',
        args: {
          ...userFields,
          query: envelope.query ?? '',
          page_size: 10,
        },
      };

    case 'workspace.drive.read': {
      const fid = envelope.resource_ref?.id?.trim();
      if (!fid) {
        return { ok: false, message: 'workspace.drive.read requires resource_ref.id (Drive file id).' };
      }
      return { ok: true, tool: 'get_drive_file_content', args: { ...userFields, file_id: fid } };
    }

    case 'workspace.docs.read': {
      const docId = envelope.resource_ref?.id?.trim();
      if (!docId) {
        return { ok: false, message: 'workspace.docs.read requires resource_ref.id (Google Doc id).' };
      }
      return {
        ok: true,
        tool: 'get_doc_content',
        args: { ...userFields, document_id: docId },
      };
    }

    case 'workspace.docs.export': {
      const docId = envelope.resource_ref?.id?.trim();
      if (!docId) {
        return { ok: false, message: 'workspace.docs.export requires resource_ref.id (Google Doc id).' };
      }
      return {
        ok: true,
        tool: 'get_doc_as_markdown',
        args: { ...userFields, document_id: docId, include_comments: false },
      };
    }

    case 'workspace.contacts.list': {
      const pageToken = envelope.contacts_page_token?.trim();
      return {
        ok: true,
        tool: 'list_contacts',
        args: {
          ...userFields,
          page_size: 100,
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      };
    }

    case 'workspace.contacts.search':
      return {
        ok: true,
        tool: 'search_contacts',
        args: {
          ...userFields,
          query: envelope.query ?? '',
          page_size: 30,
        },
      };

    case 'workspace.tasks.list': {
      const listId = envelope.resource_ref?.id?.trim();
      if (!listId) {
        return {
          ok: false,
          message:
            'workspace.tasks.list requires resource_ref.id (task list id from the Tasks API, e.g. after listing task lists).',
        };
      }
      return {
        ok: true,
        tool: 'list_tasks',
        args: { ...userFields, task_list_id: listId },
      };
    }

    case 'workspace.tasks.get': {
      const raw = envelope.resource_ref?.id?.trim() ?? '';
      const [taskListId, taskId] = raw.split(':').map((s) => s.trim());
      if (!taskListId || !taskId) {
        return {
          ok: false,
          message: 'workspace.tasks.get requires resource_ref.id as "taskListId:taskId".',
        };
      }
      return {
        ok: true,
        tool: 'get_task',
        args: { ...userFields, task_list_id: taskListId, task_id: taskId },
      };
    }

    case 'workspace.web.search': {
      const q = (envelope.query ?? '').trim() || '.';
      return {
        ok: true,
        tool: 'search_custom',
        args: {
          ...userFields,
          q,
          num: 10,
          start: 1,
        },
      };
    }

    default:
      return { ok: false, message: `No MCP tool mapping for intent: ${intent}` };
  }
}
