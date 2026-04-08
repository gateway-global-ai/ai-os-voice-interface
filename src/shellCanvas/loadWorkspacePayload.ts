/**
 * Async data boundary for Workspace canvas views — Integration Control Plane (AIOS-SPEC-007).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CanvasView } from './canvasTypes';
import type { WorkspaceRoutingEnvelope } from '../workspace/types';
import type { ExecutionPlanDecision } from '../intent/executionPlanPolicy';
import { runWorkspaceControlPlane } from '../workspace/integrationControlPlane';
import { buildCalendarListScope } from '../scope/buildExecutionScope';
import type { WorkspaceState } from '../shell/workspaceState';
import { resolveWorkspaceState, shouldShowWorkspaceHub } from '../shell/workspaceState';
import {
  MAIL_REVIEW_UNREAD_APPROVAL_RATIONALE,
  MAIL_REVIEW_UNREAD_INTENT_LABEL,
  MAIL_REVIEW_UNREAD_PERIOD_LABEL,
  MAIL_REVIEW_UNREAD_SCOPE_SUMMARY,
  runReviewUnreadMailPolicy,
  type MailReviewUnreadPolicyResult,
} from '../workspace/mailReviewUnreadPlan';
import { estimateMcpResultCount } from '../workspace/workspaceMcpDisplay';
import { workspaceDriveListDataIsEmpty } from '../workspace/driveListEmpty';

/** Google Workspace hub (AIOS-SPEC-007 Phase 1 read plane UI shell). */
export type WorkspaceHubPayload = {
  view: 'workspace_hub';
  phase: 1;
  specRef: 'AIOS-SPEC-007';
  workspaceState: WorkspaceState;
};

export type WorkspaceOnboardingPayload = {
  view: 'workspace_onboarding';
  phase: 1;
  specRef: 'AIOS-SPEC-007';
  workspaceState: WorkspaceState;
};

export type WorkspaceCalendarRead = {
  loadState: 'ok' | 'empty' | 'error' | 'not_configured';
  data?: unknown;
  errorMessage?: string;
  controlPlaneCode?: string;
  adapterCode?: 'not_configured' | 'timeout' | 'aborted' | 'http_error' | 'auth_error';
  auditId?: string;
};

export type WorkspaceCalendarHubPayload = {
  view: 'workspace_calendar_hub';
  phase: 1;
  specRef: 'AIOS-SPEC-007';
  calendarRead: WorkspaceCalendarRead;
};

/** Policy + disclosure slice for mail search (read plane). */
export type WorkspaceMailReviewSlice = {
  intentLabel: string;
  scopeSummary: string;
  periodLabel: string;
  expectedOutcome: string;
  policyDecision: ExecutionPlanDecision;
  userMessages: string[];
  gmailQuery: string;
  estimatedResultCount?: number;
  approvalRationale?: string[];
};

export type WorkspaceMailSearch = {
  loadState: 'ok' | 'empty' | 'error' | 'not_configured';
  data?: unknown;
  errorMessage?: string;
  controlPlaneCode?: string;
  adapterCode?: 'not_configured' | 'timeout' | 'aborted' | 'http_error' | 'auth_error';
  auditId?: string;
  mailReviewSlice?: WorkspaceMailReviewSlice;
};

export type WorkspaceMailRead = WorkspaceMailSearch;

export type WorkspaceToolRead = WorkspaceMailSearch;

export type WorkspaceMailHubPayload = {
  view: 'workspace_mail_hub';
  phase: 1;
  specRef: 'AIOS-SPEC-007';
  mailSearch: WorkspaceMailSearch;
  mailRead?: WorkspaceMailRead;
  openMailMessageId?: string;
};

export type WorkspaceDriveHubPayload = {
  view: 'workspace_drive_hub';
  phase: 1;
  specRef: 'AIOS-SPEC-007';
  toolRead: WorkspaceToolRead;
};

export type WorkspaceContactsHubPayload = {
  view: 'workspace_contacts_hub';
  phase: 1;
  specRef: 'AIOS-SPEC-007';
  toolRead: WorkspaceToolRead;
};

export type WorkspaceSearchHubPayload = {
  view: 'workspace_search_hub';
  phase: 1;
  specRef: 'AIOS-SPEC-007';
  toolRead: WorkspaceToolRead;
};

export type WorkspaceViewPayload =
  | WorkspaceHubPayload
  | WorkspaceOnboardingPayload
  | WorkspaceCalendarHubPayload
  | WorkspaceMailHubPayload
  | WorkspaceDriveHubPayload
  | WorkspaceContactsHubPayload
  | WorkspaceSearchHubPayload;

function buildMailHubReviewSlice(
  policy: MailReviewUnreadPolicyResult,
  estimatedCount?: number
): WorkspaceMailReviewSlice {
  return {
    intentLabel: MAIL_REVIEW_UNREAD_INTENT_LABEL,
    scopeSummary: MAIL_REVIEW_UNREAD_SCOPE_SUMMARY,
    periodLabel: MAIL_REVIEW_UNREAD_PERIOD_LABEL,
    expectedOutcome: policy.plan.expectedOutcome,
    policyDecision: policy.evaluation.decision,
    userMessages: policy.userMessages,
    gmailQuery: policy.gmailQuery,
    estimatedResultCount: estimatedCount,
    approvalRationale:
      policy.evaluation.decision === 'auto_approve' ? [...MAIL_REVIEW_UNREAD_APPROVAL_RATIONALE] : undefined,
  };
}

function workspaceCalendarDataIsEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.calendars)) return o.calendars.length === 0;
    if (Array.isArray(o.items)) return o.items.length === 0;
    if (Array.isArray(o.events)) return o.events.length === 0;
    if (Array.isArray(o.eventList)) return o.eventList.length === 0;
  }
  return false;
}

function workspaceMailDataIsEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (typeof data === 'string') return data.trim().length === 0;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.messages)) return o.messages.length === 0;
    if (Array.isArray(o.threads)) return o.threads.length === 0;
    if (Array.isArray(o.items)) return o.items.length === 0;
    if (Array.isArray(o.messageList)) return o.messageList.length === 0;
  }
  return false;
}

function workspaceToolDataIsEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (typeof data === 'string') return data.trim().length === 0;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.files)) return o.files.length === 0;
    if (Array.isArray(o.contacts)) return o.contacts.length === 0;
    if (Array.isArray(o.messages)) return o.messages.length === 0;
    if (Array.isArray(o.items)) return o.items.length === 0;
  }
  return false;
}

function workspaceMailReadDataIsEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (o.id != null || o.messageId != null) return false;
    const body = o.body ?? o.textBody ?? o.snippet ?? o.payload;
    if (typeof body === 'string') return body.trim().length === 0;
    if (body != null && typeof body === 'object' && Object.keys(body as object).length === 0) {
      return true;
    }
  }
  return false;
}

export function isPayloadEmpty(p: WorkspaceViewPayload): boolean {
  switch (p.view) {
    case 'workspace_hub':
    case 'workspace_onboarding':
      return false;
    case 'workspace_calendar_hub': {
      const cr = p.calendarRead;
      if (!cr) return false;
      if (cr.loadState === 'empty') return true;
      return false;
    }
    case 'workspace_mail_hub': {
      const ms = p.mailSearch;
      if (!ms) return false;
      if (ms.loadState === 'empty') return true;
      return false;
    }
    case 'workspace_drive_hub':
    case 'workspace_contacts_hub':
    case 'workspace_search_hub': {
      const tr = p.toolRead;
      if (!tr) return false;
      if (tr.loadState === 'empty') return true;
      return false;
    }
    default:
      return false;
  }
}

export async function loadWorkspacePayload(
  view: CanvasView,
  params:
    | {
        documentId?: string;
        workflowRunId?: string;
        actionPlanSource?: string;
        amendmentWorkflowMode?: 'edit' | 'review';
        mailMessageId?: string;
      }
    | undefined,
  signal?: AbortSignal
): Promise<WorkspaceViewPayload> {
  const abort = () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  };

  switch (view) {
    case 'workspace_hub': {
      abort();
      const ws = resolveWorkspaceState();
      if (!shouldShowWorkspaceHub(ws)) {
        return {
          view: 'workspace_onboarding',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          workspaceState: ws,
        };
      }
      return {
        view: 'workspace_hub',
        phase: 1,
        specRef: 'AIOS-SPEC-007',
        workspaceState: ws,
      };
    }
    case 'workspace_calendar_hub': {
      abort();
      const wsGate = resolveWorkspaceState();
      if (!shouldShowWorkspaceHub(wsGate)) {
        return {
          view: 'workspace_onboarding',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          workspaceState: wsGate,
        };
      }
      const envelope: WorkspaceRoutingEnvelope = {
        intent: 'workspace.calendar.list',
        actor_type: 'founder',
        tenant_id: 'local',
        user_binding: 'browser',
        execution_mode: 'execute',
        policy_context: { scope_class: 'workspace.google.read' },
        execution_scope: buildCalendarListScope(),
      };
      const result = await runWorkspaceControlPlane(envelope, { surfaceMode: 'founder', signal });
      abort();
      if (result.ok === false) {
        const loadState =
          result.code === 'not_configured' ? 'not_configured' : ('error' as const);
        return {
          view: 'workspace_calendar_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          calendarRead: {
            loadState,
            errorMessage: result.message,
            controlPlaneCode: result.code,
            adapterCode: result.adapterCode,
            auditId: result.auditId,
          },
        };
      }
      const empty = workspaceCalendarDataIsEmpty(result.data);
      return {
        view: 'workspace_calendar_hub',
        phase: 1,
        specRef: 'AIOS-SPEC-007',
        calendarRead: {
          loadState: empty ? 'empty' : 'ok',
          data: result.data,
          auditId: result.auditId,
        },
      };
    }
    case 'workspace_mail_hub': {
      abort();
      const wsMailGate = resolveWorkspaceState();
      if (!shouldShowWorkspaceHub(wsMailGate)) {
        return {
          view: 'workspace_onboarding',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          workspaceState: wsMailGate,
        };
      }
      const mailPolicy = runReviewUnreadMailPolicy();
      const baseSlice = buildMailHubReviewSlice(mailPolicy);
      if (mailPolicy.evaluation.decision === 'block') {
        return {
          view: 'workspace_mail_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          mailSearch: {
            loadState: 'error',
            errorMessage:
              mailPolicy.userMessages[0] ?? 'This mail review action is blocked by execution policy.',
            mailReviewSlice: baseSlice,
          },
        };
      }
      const mailEnvelope: WorkspaceRoutingEnvelope = {
        intent: 'workspace.mail.search',
        actor_type: 'founder',
        tenant_id: 'local',
        user_binding: 'browser',
        execution_mode: 'execute',
        policy_context: { scope_class: 'workspace.google.read' },
        query: mailPolicy.gmailQuery,
      };
      const mailResult = await runWorkspaceControlPlane(mailEnvelope, {
        surfaceMode: 'founder',
        signal,
      });
      abort();
      if (mailResult.ok === false) {
        const mailLoadState =
          mailResult.code === 'not_configured' ? 'not_configured' : ('error' as const);
        return {
          view: 'workspace_mail_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          mailSearch: {
            loadState: mailLoadState,
            errorMessage: mailResult.message,
            controlPlaneCode: mailResult.code,
            adapterCode: mailResult.adapterCode,
            auditId: mailResult.auditId,
            mailReviewSlice: baseSlice,
          },
        };
      }
      const mailEmpty = workspaceMailDataIsEmpty(mailResult.data);
      const est = estimateMcpResultCount(mailResult.data);
      const mailSearch: WorkspaceMailSearch = {
        loadState: mailEmpty ? 'empty' : 'ok',
        data: mailResult.data,
        auditId: mailResult.auditId,
        mailReviewSlice: buildMailHubReviewSlice(mailPolicy, est),
      };

      const mid = params?.mailMessageId?.trim();
      if (!mid) {
        return {
          view: 'workspace_mail_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          mailSearch,
        };
      }

      const readEnvelope: WorkspaceRoutingEnvelope = {
        intent: 'workspace.mail.read',
        actor_type: 'founder',
        tenant_id: 'local',
        user_binding: 'browser',
        execution_mode: 'execute',
        policy_context: { scope_class: 'workspace.google.read' },
        resource_ref: { type: 'message', id: mid },
      };
      const readResult = await runWorkspaceControlPlane(readEnvelope, {
        surfaceMode: 'founder',
        signal,
      });
      abort();
      if (readResult.ok === false) {
        const readLoadState =
          readResult.code === 'not_configured' ? 'not_configured' : ('error' as const);
        return {
          view: 'workspace_mail_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          mailSearch,
          mailRead: {
            loadState: readLoadState,
            errorMessage: readResult.message,
            controlPlaneCode: readResult.code,
            adapterCode: readResult.adapterCode,
            auditId: readResult.auditId,
          },
          openMailMessageId: mid,
        };
      }
      const readEmpty = workspaceMailReadDataIsEmpty(readResult.data);
      return {
        view: 'workspace_mail_hub',
        phase: 1,
        specRef: 'AIOS-SPEC-007',
        mailSearch,
        mailRead: {
          loadState: readEmpty ? 'empty' : 'ok',
          data: readResult.data,
          auditId: readResult.auditId,
        },
        openMailMessageId: mid,
      };
    }
    case 'workspace_drive_hub': {
      abort();
      const wsDriveGate = resolveWorkspaceState();
      if (!shouldShowWorkspaceHub(wsDriveGate)) {
        return {
          view: 'workspace_onboarding',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          workspaceState: wsDriveGate,
        };
      }
      const driveEnvelope: WorkspaceRoutingEnvelope = {
        intent: 'workspace.drive.list',
        actor_type: 'founder',
        tenant_id: 'local',
        user_binding: 'browser',
        execution_mode: 'execute',
        policy_context: { scope_class: 'workspace.google.read' },
        query: '',
      };
      const driveResult = await runWorkspaceControlPlane(driveEnvelope, {
        surfaceMode: 'founder',
        signal,
      });
      abort();
      if (driveResult.ok === false) {
        const ls = driveResult.code === 'not_configured' ? 'not_configured' : ('error' as const);
        return {
          view: 'workspace_drive_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          toolRead: {
            loadState: ls,
            errorMessage: driveResult.message,
            controlPlaneCode: driveResult.code,
            adapterCode: driveResult.adapterCode,
            auditId: driveResult.auditId,
          },
        };
      }
      const driveEmpty = workspaceDriveListDataIsEmpty(driveResult.data);
      return {
        view: 'workspace_drive_hub',
        phase: 1,
        specRef: 'AIOS-SPEC-007',
        toolRead: {
          loadState: driveEmpty ? 'empty' : 'ok',
          data: driveResult.data,
          auditId: driveResult.auditId,
        },
      };
    }
    case 'workspace_contacts_hub': {
      abort();
      const wsContactsGate = resolveWorkspaceState();
      if (!shouldShowWorkspaceHub(wsContactsGate)) {
        return {
          view: 'workspace_onboarding',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          workspaceState: wsContactsGate,
        };
      }
      const contactsEnvelope: WorkspaceRoutingEnvelope = {
        intent: 'workspace.contacts.list',
        actor_type: 'founder',
        tenant_id: 'local',
        user_binding: 'browser',
        execution_mode: 'execute',
        policy_context: { scope_class: 'workspace.google.identity' },
      };
      const contactsResult = await runWorkspaceControlPlane(contactsEnvelope, {
        surfaceMode: 'founder',
        signal,
      });
      abort();
      if (contactsResult.ok === false) {
        const ls = contactsResult.code === 'not_configured' ? 'not_configured' : ('error' as const);
        return {
          view: 'workspace_contacts_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          toolRead: {
            loadState: ls,
            errorMessage: contactsResult.message,
            controlPlaneCode: contactsResult.code,
            adapterCode: contactsResult.adapterCode,
            auditId: contactsResult.auditId,
          },
        };
      }
      const contactsEmpty = workspaceToolDataIsEmpty(contactsResult.data);
      return {
        view: 'workspace_contacts_hub',
        phase: 1,
        specRef: 'AIOS-SPEC-007',
        toolRead: {
          loadState: contactsEmpty ? 'empty' : 'ok',
          data: contactsResult.data,
          auditId: contactsResult.auditId,
        },
      };
    }
    case 'workspace_search_hub': {
      abort();
      const wsSearchGate = resolveWorkspaceState();
      if (!shouldShowWorkspaceHub(wsSearchGate)) {
        return {
          view: 'workspace_onboarding',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          workspaceState: wsSearchGate,
        };
      }
      const searchEnvelope: WorkspaceRoutingEnvelope = {
        intent: 'workspace.web.search',
        actor_type: 'founder',
        tenant_id: 'local',
        user_binding: 'browser',
        execution_mode: 'execute',
        policy_context: { scope_class: 'workspace.google.search' },
        query: '',
      };
      const searchResult = await runWorkspaceControlPlane(searchEnvelope, {
        surfaceMode: 'founder',
        signal,
      });
      abort();
      if (searchResult.ok === false) {
        const ls = searchResult.code === 'not_configured' ? 'not_configured' : ('error' as const);
        return {
          view: 'workspace_search_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          toolRead: {
            loadState: ls,
            errorMessage: searchResult.message,
            controlPlaneCode: searchResult.code,
            adapterCode: searchResult.adapterCode,
            auditId: searchResult.auditId,
          },
        };
      }
      const searchEmpty = workspaceToolDataIsEmpty(searchResult.data);
      return {
        view: 'workspace_search_hub',
        phase: 1,
        specRef: 'AIOS-SPEC-007',
        toolRead: {
          loadState: searchEmpty ? 'empty' : 'ok',
          data: searchResult.data,
          auditId: searchResult.auditId,
        },
      };
    }
    default: {
      throw new Error(`Unhandled canvas view: ${String(view)}`);
    }
  }
}
