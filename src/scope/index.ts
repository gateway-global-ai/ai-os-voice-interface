/**
 * SPEC-010 Execution Scope Envelope — public API for plans and ICP.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type {
  ExecutionScopeEnvelope,
  ExecutionScopePaths,
  ScopeConfidenceLevel,
} from './executionScopeTypes';
export {
  buildCalendarEventsListScope,
  buildCalendarGetScope,
  buildCalendarListScope,
  buildMailDraftReplyScope,
  buildMailThreadReadScope,
  buildMailThreadSummarizeScope,
  newScopePlanId,
} from './buildExecutionScope';
export {
  GCAL_LIST_CALENDARS_KEY,
  gcalEventKey,
  gcalEventsWindowKey,
  gmailMessageKey,
  gmailThreadKey,
} from './resourceKeys';
export { routingEnvelopeToScopeTarget } from './scopeRouting';
export type { RoutedScopeTarget } from './scopeRouting';
export { validateScopeOperation } from './validateScope';
export type { ScopeOperation, ScopeValidationResult } from './validateScope';
export { logScopeAllow, logScopeViolation } from './scopeAudit';
export {
  getScopeMetricsSnapshot,
  recordScopeCheck,
  recordThreadSummarizeBoundedContext,
  resetScopeMetricsForTests,
  type ScopeMetricsSnapshot,
} from './scopeMetrics';
