/**
 * Governance canvas: intent + role first, then focused work surfaces — not a document dashboard.
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** One surface at a time. Entry is always `governance_hub` for the current actor (founder). */
export type CanvasView =
  | 'governance_hub'
  | 'review_docs'
  | 'discuss_documents'
  | 'planning_assistant'
  | 'research_assistant'
  | 'amendment_hub'
  | 'amendment_workflow'
  | 'document_list'
  | 'document_view'
  | 'conflict_results'
  | 'compliance_check'
  | 'lifecycle_status'
  | 'action_plan_review'
  | 'workspace_hub'
  | 'workspace_onboarding'
  | 'workspace_calendar_hub'
  | 'workspace_mail_hub';

/** Structured intents from the agent (INTENT_JSON). */
export type GovernanceIntentId =
  | 'none'
  | 'governance.documents.list'
  | 'governance.documents.open'
  | 'governance.amendment.workflow'
  | 'governance.amendment.hub'
  | 'governance.amendment.resume'
  | 'governance.amendment.review'
  | 'governance.amendment.create'
  | 'governance.conflicts.scan'
  | 'governance.compliance.check'
  | 'governance.lifecycle.status'
  | 'governance.action_plan.review';

export type ParsedGovernanceIntent = {
  intent: GovernanceIntentId;
  document_id?: string;
  workflow_run_id?: string;
  template_id?: string;
  amendment_mode?: 'edit' | 'review';
};

export type GovernanceCanvasState = {
  view: CanvasView;
  documentId?: string;
  workflowRunId?: string;
  /** Folder under governing_docs/sources/ (e.g. AMD-2026-a10b9a). */
  actionPlanSource?: string;
  /** Amendment workflow surface: edit vs read-only review of a run. */
  amendmentWorkflowMode?: 'edit' | 'review';
} | null;

/** Maps agent intent → canvas view (PolicyDecision gates before apply). */
export function intentToCanvasView(parsed: ParsedGovernanceIntent): GovernanceCanvasState {
  switch (parsed.intent) {
    case 'governance.documents.list':
      return { view: 'governance_hub' };
    case 'governance.documents.open':
      if (parsed.document_id?.trim()) {
        return { view: 'document_view', documentId: parsed.document_id.trim() };
      }
      return { view: 'governance_hub' };
    case 'governance.conflicts.scan':
      return { view: 'conflict_results' };
    case 'governance.compliance.check':
      return { view: 'compliance_check' };
    case 'governance.lifecycle.status':
      return { view: 'lifecycle_status' };
    case 'governance.amendment.workflow':
      return { view: 'amendment_hub' };
    case 'governance.amendment.hub':
    case 'governance.amendment.create':
      return { view: 'amendment_hub' };
    case 'governance.amendment.resume': {
      const rid =
        parsed.workflow_run_id?.trim() ||
        parsed.document_id?.trim();
      if (rid) {
        return {
          view: 'amendment_workflow',
          workflowRunId: rid,
          amendmentWorkflowMode: 'edit',
        };
      }
      return { view: 'amendment_hub' };
    }
    case 'governance.amendment.review': {
      const rid =
        parsed.workflow_run_id?.trim() ||
        parsed.document_id?.trim();
      if (rid) {
        return {
          view: 'amendment_workflow',
          workflowRunId: rid,
          amendmentWorkflowMode: 'review',
        };
      }
      return { view: 'amendment_hub' };
    }
    case 'governance.action_plan.review':
      return {
        view: 'action_plan_review',
        actionPlanSource: parsed.document_id?.trim() || 'AMD-2026-a10b9a',
      };
    default:
      return null;
  }
}

export const ALL_CANVAS_VIEWS: CanvasView[] = [
  'governance_hub',
  'review_docs',
  'discuss_documents',
  'planning_assistant',
  'research_assistant',
  'amendment_hub',
  'amendment_workflow',
  'document_list',
  'document_view',
  'conflict_results',
  'compliance_check',
  'lifecycle_status',
  'action_plan_review',
  'workspace_hub',
  'workspace_onboarding',
  'workspace_calendar_hub',
  'workspace_mail_hub',
];
