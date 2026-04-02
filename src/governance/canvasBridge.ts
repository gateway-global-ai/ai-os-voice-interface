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
  getAmendmentWorkflowRun,
  advanceAmendmentWorkflowRun,
  getActionPlan,
  putActionPlan,
  executeActionPlan,
} from '../api/governance';

export type {
  DocumentListItem,
  DocumentDetail,
  ConflictScanResult,
  ComplianceResult,
  AmendmentWorkflowRunState,
  ActionPlanBundle,
  ActionPlanDocument,
  ActionPlanAction,
} from '../api/governance';

// TODO: wrap each call with audit log + optional knowledge-layer filter before return
