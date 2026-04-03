/**
 * Async data boundary for governance canvas views — invoked only from GovernanceCanvasProvider.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CanvasView } from './canvasTypes';
import {
  listDocuments,
  getDocument,
  getDocumentVersions,
  checkConflicts,
  listPrimitives,
  getAmendmentWorkflowRun,
  loadAmendmentWorkflowRunsList,
  loadAmendmentWorkflowTemplatesList,
  getActionPlan,
  type DocumentListItem,
  type DocumentDetail,
  type ConflictScanResult,
  type AmendmentWorkflowRunState,
  type AmendmentWorkflowRunSummary,
  type AmendmentLoadState,
  type ActionPlanBundle,
} from './canvasBridge';
import { classifyAmendmentRunStatus, type AmendmentStatusBucket } from './amendmentStatus';
import { pickReviewPinnedDocuments } from './governancePinned';
import { formalGovernanceDocumentsInRegistryOrder } from './governanceFormal';
import {
  attachIntroductionNumbers,
  sortFormalDocumentsByIntroductionTable,
  type PlanningDocumentItem,
} from './governanceIntroductionOrder';

export type GovernanceHubPayload = {
  view: 'governance_hub';
  actorRole: string;
  actorLabel: string;
};

export type GovernanceReviewDocsPayload = {
  view: 'review_docs';
  pinned: DocumentListItem[];
  registryCount: number;
};

export type GovernanceDiscussPayload = {
  view: 'discuss_documents';
};

export type GovernancePlanningPayload = {
  view: 'planning_assistant';
  documents: PlanningDocumentItem[];
  recommendedNextSteps: string[];
  progressSummary: string;
};

export type GovernanceResearchPayload = {
  view: 'research_assistant';
  library: DocumentListItem[];
  registryCount: number;
};

export type GovernanceListPayload = {
  view: 'document_list';
  documents: DocumentListItem[];
};

export type GovernanceDocumentPayload = {
  view: 'document_view';
  documentId: string;
  document: DocumentDetail;
};

export type GovernanceConflictPayload = {
  view: 'conflict_results';
  scan: ConflictScanResult;
};

export type GovernanceCompliancePayload = {
  view: 'compliance_check';
  primitiveNames: string[];
};

export type GovernanceLifecyclePayload = {
  view: 'lifecycle_status';
  documents: DocumentListItem[];
  selectedId: string;
  versions: Array<Record<string, unknown>>;
};

export type AmendmentHubRunRow = {
  run_id: string;
  template_id: string;
  title: string;
  status: string;
  /** Derived bucket for display — raw `status` is still authoritative for audit. */
  statusBucket: AmendmentStatusBucket;
  updated_at: string;
  amendment_id?: string;
};

/** Per-resource load truth: `empty` = success with zero rows; `error` = fetch failed. */
export type AmendmentHubResourceLoad = {
  loadState: AmendmentLoadState;
  errorMessage?: string;
};

export type GovernanceAmendmentHubPayload = {
  view: 'amendment_hub';
  runsLoad: AmendmentHubResourceLoad;
  templatesLoad: AmendmentHubResourceLoad;
  workspace: {
    inProgress: AmendmentHubRunRow[];
    completed: AmendmentHubRunRow[];
    /** Status string did not map to in-progress or completed — verify before acting. */
    unknownStatus: AmendmentHubRunRow[];
  };
  templates: Array<{
    template_id: string;
    title: string;
    amendment_id: string;
    affected_documents: string[];
  }>;
  summary: {
    totalRuns: number;
    inProgressCount: number;
    completedCount: number;
    unknownCount: number;
  };
};

export type GovernanceAmendmentWorkflowPayload = {
  view: 'amendment_workflow';
  run: AmendmentWorkflowRunState;
  /** Loaded run surface: editing vs reviewing without advancing steps. */
  mode: 'edit' | 'review';
};

export type GovernanceActionPlanPayload = {
  view: 'action_plan_review';
  sourceName: string;
  bundle: ActionPlanBundle;
};

/** Google Workspace governed hub (AIOS-SPEC-007 Phase 1 read plane UI shell). */
export type GovernanceWorkspaceHubPayload = {
  view: 'workspace_hub';
  phase: 1;
  specRef: 'AIOS-SPEC-007';
};

export type GovernanceWorkspaceCalendarHubPayload = {
  view: 'workspace_calendar_hub';
  phase: 1;
  specRef: 'AIOS-SPEC-007';
};

export type GovernanceViewPayload =
  | GovernanceHubPayload
  | GovernanceReviewDocsPayload
  | GovernanceDiscussPayload
  | GovernancePlanningPayload
  | GovernanceResearchPayload
  | GovernanceAmendmentHubPayload
  | GovernanceAmendmentWorkflowPayload
  | GovernanceActionPlanPayload
  | GovernanceListPayload
  | GovernanceDocumentPayload
  | GovernanceConflictPayload
  | GovernanceCompliancePayload
  | GovernanceLifecyclePayload
  | GovernanceWorkspaceHubPayload
  | GovernanceWorkspaceCalendarHubPayload;

function summaryToHubRow(r: AmendmentWorkflowRunSummary): AmendmentHubRunRow {
  const meta = r.meta ?? {};
  const title =
    (typeof meta.title === 'string' && meta.title) ||
    (typeof meta.amendment_id === 'string' && meta.amendment_id) ||
    r.run_id;
  const amendment_id = typeof meta.amendment_id === 'string' ? meta.amendment_id : undefined;
  const statusBucket = classifyAmendmentRunStatus(r.status);
  return {
    run_id: r.run_id,
    template_id: r.template_id,
    title,
    status: r.status,
    statusBucket,
    updated_at: r.updated_at,
    amendment_id,
  };
}

function pickResearchLibrary(documents: DocumentListItem[]): DocumentListItem[] {
  const research = documents.filter((d) => {
    const t = `${d.category} ${d.path} ${d.title}`.toLowerCase();
    return t.includes('research');
  });
  if (research.length > 0) return research;
  return documents.slice(0, 12);
}

export function isPayloadEmpty(p: GovernanceViewPayload): boolean {
  switch (p.view) {
    case 'governance_hub':
    case 'discuss_documents':
      return false;
    case 'review_docs':
      return p.registryCount === 0;
    case 'planning_assistant':
      return p.documents.length === 0;
    case 'research_assistant':
      return p.registryCount === 0;
    case 'document_list':
      return p.documents.length === 0;
    case 'document_view':
      return false;
    case 'conflict_results':
      return p.scan.findings_count === 0;
    case 'compliance_check':
      return p.primitiveNames.length === 0;
    case 'lifecycle_status':
      return p.documents.length === 0;
    case 'amendment_hub': {
      if (p.runsLoad.loadState === 'error' || p.templatesLoad.loadState === 'error') {
        return false;
      }
      return p.summary.totalRuns === 0 && p.templates.length === 0;
    }
    case 'amendment_workflow':
      return !p.run?.run_id;
    case 'action_plan_review':
      return !p.bundle?.plan;
    case 'workspace_hub':
    case 'workspace_calendar_hub':
      return false;
    default:
      return false;
  }
}

export async function loadGovernancePayload(
  view: CanvasView,
  params:
    | {
        documentId?: string;
        workflowRunId?: string;
        actionPlanSource?: string;
        amendmentWorkflowMode?: 'edit' | 'review';
      }
    | undefined,
  signal?: AbortSignal
): Promise<GovernanceViewPayload> {
  const abort = () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  };

  switch (view) {
    case 'governance_hub': {
      abort();
      return {
        view: 'governance_hub',
        actorRole: 'founder',
        actorLabel: 'Founder',
      };
    }
    case 'review_docs': {
      abort();
      const documents = await listDocuments({ includeDrafts: true });
      abort();
      const pinned = pickReviewPinnedDocuments(documents);
      return {
        view: 'review_docs',
        pinned,
        registryCount: documents.length,
      };
    }
    case 'discuss_documents': {
      abort();
      return { view: 'discuss_documents' };
    }
    case 'planning_assistant': {
      abort();
      const raw = await listDocuments({ includeDrafts: true });
      abort();
      const formal = formalGovernanceDocumentsInRegistryOrder(raw);
      const ordered = sortFormalDocumentsByIntroductionTable(formal);
      const documents = attachIntroductionNumbers(ordered);
      const ratified = documents.filter((d) => d.status === 'ratified').length;
      const draft = documents.filter((d) => d.status === 'draft').length;
      const steps: string[] = [];
      if (documents.length === 0) {
        steps.push('No formal governing documents in the registry — add AIOS-CORE / SPEC / COMM entries.');
      } else {
        if (draft > 0) {
          steps.push(`Advance ${draft} draft document(s) toward ratification.`);
        }
        if (ratified < documents.length) {
          steps.push('Work through non-ratified items in introduction.md order below.');
        }
        steps.push('Run a conflict scan before batch updates.');
        steps.push('Validate compliance when changing core primitives.');
      }
      return {
        view: 'planning_assistant',
        documents,
        recommendedNextSteps: steps.slice(0, 5),
        progressSummary:
          documents.length === 0
            ? 'No formal governing documents in registry.'
            : `${ratified} ratified · ${draft} draft · ${documents.length} governing documents (introduction.md order)`,
      };
    }
    case 'research_assistant': {
      abort();
      const documents = await listDocuments({ includeDrafts: true });
      abort();
      const library = pickResearchLibrary(documents);
      return {
        view: 'research_assistant',
        library,
        registryCount: documents.length,
      };
    }
    case 'amendment_hub': {
      abort();
      const [runsOutcome, templatesOutcome] = await Promise.all([
        loadAmendmentWorkflowRunsList(),
        loadAmendmentWorkflowTemplatesList(),
      ]);
      abort();
      const runsRaw = runsOutcome.runs;
      const rows = runsRaw.map(summaryToHubRow);
      const inProgress = rows.filter((r) => r.statusBucket === 'in_progress');
      const completed = rows.filter((r) => r.statusBucket === 'completed');
      const unknownStatus = rows.filter((r) => r.statusBucket === 'unknown');
      return {
        view: 'amendment_hub',
        runsLoad: {
          loadState: runsOutcome.loadState,
          errorMessage: runsOutcome.errorMessage,
        },
        templatesLoad: {
          loadState: templatesOutcome.loadState,
          errorMessage: templatesOutcome.errorMessage,
        },
        workspace: { inProgress, completed, unknownStatus },
        templates: templatesOutcome.templates,
        summary: {
          totalRuns: rows.length,
          inProgressCount: inProgress.length,
          completedCount: completed.length,
          unknownCount: unknownStatus.length,
        },
      };
    }
    case 'amendment_workflow': {
      const workflowRunId = params?.workflowRunId?.trim();
      if (!workflowRunId) {
        throw new Error(
          'Amendment workflow needs a run. Open Amendment Program, then create or resume a run.'
        );
      }
      abort();
      const run = await getAmendmentWorkflowRun(workflowRunId);
      abort();
      const mode = params?.amendmentWorkflowMode === 'review' ? 'review' : 'edit';
      return { view: 'amendment_workflow', run, mode };
    }
    case 'document_list': {
      abort();
      const documents = await listDocuments({ includeDrafts: true });
      abort();
      return { view: 'document_list', documents };
    }
    case 'document_view': {
      const documentId = params?.documentId?.trim();
      if (!documentId) throw new Error('document_id required');
      abort();
      const document = await getDocument(documentId, true);
      abort();
      return { view: 'document_view', documentId, document };
    }
    case 'conflict_results': {
      abort();
      const scan = await checkConflicts(params?.documentId);
      abort();
      return { view: 'conflict_results', scan };
    }
    case 'compliance_check': {
      abort();
      const primitives = await listPrimitives();
      abort();
      return {
        view: 'compliance_check',
        primitiveNames: primitives.map((p) => p.name),
      };
    }
    case 'lifecycle_status': {
      abort();
      const documents = await listDocuments({ includeDrafts: true });
      abort();
      const initial = params?.documentId?.trim();
      const selectedId =
        initial && documents.some((d) => d.document_id === initial)
          ? initial
          : documents[0]?.document_id ?? '';
      let versions: Array<Record<string, unknown>> = [];
      if (selectedId) {
        const v = await getDocumentVersions(selectedId);
        abort();
        versions = Array.isArray(v) ? v : [];
      }
      return { view: 'lifecycle_status', documents, selectedId, versions };
    }
    case 'action_plan_review': {
      const sourceName = params?.actionPlanSource?.trim() || 'AMD-2026-a10b9a';
      abort();
      const bundle = await getActionPlan(sourceName);
      abort();
      return {
        view: 'action_plan_review',
        sourceName,
        bundle,
      };
    }
    case 'workspace_hub': {
      abort();
      return { view: 'workspace_hub', phase: 1, specRef: 'AIOS-SPEC-007' };
    }
    case 'workspace_calendar_hub': {
      abort();
      return { view: 'workspace_calendar_hub', phase: 1, specRef: 'AIOS-SPEC-007' };
    }
    default: {
      throw new Error(`Unhandled canvas view: ${String(view)}`);
    }
  }
}

/** Refetch versions only (lifecycle sub-load). */
export async function loadLifecycleVersionsPayload(
  selectedId: string,
  signal?: AbortSignal
): Promise<{ selectedId: string; versions: Array<Record<string, unknown>> }> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (!selectedId) return { selectedId: '', versions: [] };
  const v = await getDocumentVersions(selectedId);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return { selectedId, versions: Array.isArray(v) ? v : [] };
}
