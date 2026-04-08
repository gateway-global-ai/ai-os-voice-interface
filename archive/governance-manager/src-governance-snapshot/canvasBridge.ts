/**
 * Canvas ↔ API boundary. Overlays should call through here for policy, audit, caching, knowledge filter hooks.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export {
  listDocuments,
  getDocument,
  getDocumentVersions,
  diffDocuments,
  searchDocuments,
  listPrimitives,
  getGlossary,
  checkConflicts,
  checkCompliancePrimitive,
  checkComplianceKit,
  proposeAmendment,
  getAmendmentStatus,
  createAmendmentWorkflowRun,
  loadAmendmentWorkflowRunsList,
  loadAmendmentWorkflowTemplatesList,
  listAmendmentWorkflowTemplates,
  getAmendmentWorkflowRun,
  advanceAmendmentWorkflowRun,
  getActionPlan,
  putActionPlan,
  executeActionPlan,
} from '../_quarantine/documentsRestApiClient';

export type {
  DocumentListItem,
  DocumentDetail,
  ConflictScanResult,
  ComplianceResult,
  AmendmentWorkflowRunState,
  AmendmentWorkflowRunSummary,
  AmendmentLoadState,
  ActionPlanBundle,
  ActionPlanDocument,
  ActionPlanAction,
} from '../_quarantine/documentsRestApiClient';

// TODO: wrap each call with audit log + optional knowledge-layer filter before return
