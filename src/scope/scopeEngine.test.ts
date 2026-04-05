/**
 * Unit tests for SPEC-010 scope engine (validate, routing, builders, metrics).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  buildCalendarEventsListScope,
  buildCalendarGetScope,
  buildCalendarListScope,
  buildMailDraftReplyScope,
  buildMailThreadReadScope,
  buildMailThreadSummarizeScope,
} from './buildExecutionScope';
import type { ExecutionScopeEnvelope } from './executionScopeTypes';
import {
  GCAL_LIST_CALENDARS_KEY,
  gcalEventKey,
  gcalEventsWindowKey,
  gmailMessageKey,
  gmailThreadKey,
} from './resourceKeys';
import { routingEnvelopeToScopeTarget } from './scopeRouting';
import {
  getScopeMetricsSnapshot,
  recordScopeCheck,
  recordThreadSummarizeBoundedContext,
  resetScopeMetricsForTests,
} from './scopeMetrics';
import { validateScopeOperation } from './validateScope';
import type { WorkspaceRoutingEnvelope } from '../workspace/types';

function minimalEnvelope(
  overrides: Partial<WorkspaceRoutingEnvelope> & Pick<WorkspaceRoutingEnvelope, 'intent'>
): WorkspaceRoutingEnvelope {
  return {
    actor_type: 'founder',
    tenant_id: 'local',
    user_binding: 'browser',
    execution_mode: 'execute',
    policy_context: { scope_class: 'workspace.google.read' },
    ...overrides,
  } as WorkspaceRoutingEnvelope;
}

describe('validateScopeOperation', () => {
  const env = (partial: Partial<ExecutionScopeEnvelope['scope']>): ExecutionScopeEnvelope => ({
    schema_version: '1.0',
    intent_summary: 'test',
    plan_id: 'plan-test',
    scope_confidence: 'high',
    scope_rationale: ['test'],
    scope: {
      review_files: [],
      modify_files: [],
      protected_files: [],
      governing_docs: [],
      verification_targets: [],
      ...partial,
    },
  });

  it('allows read when key is in review_files', () => {
    const e = env({ review_files: ['gmail:thread:abc'], modify_files: [] });
    const r = validateScopeOperation({
      operation: 'read',
      resourceKey: 'gmail:thread:abc',
      envelope: e,
    });
    assert.equal(r.allowed, true);
  });

  it('allows read when key is only in modify_files', () => {
    const e = env({ review_files: [], modify_files: ['gmail:thread:abc'] });
    const r = validateScopeOperation({
      operation: 'read',
      resourceKey: 'gmail:thread:abc',
      envelope: e,
    });
    assert.equal(r.allowed, true);
  });

  it('denies read when key is outside envelope', () => {
    const e = env({ review_files: ['gmail:thread:abc'], modify_files: [] });
    const r = validateScopeOperation({
      operation: 'read',
      resourceKey: 'gmail:thread:other',
      envelope: e,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'read_not_in_review_or_modify');
  });

  it('denies when key is in protected_files', () => {
    const e = env({
      review_files: ['gmail:thread:abc'],
      protected_files: ['gmail:thread:abc'],
    });
    const r = validateScopeOperation({
      operation: 'read',
      resourceKey: 'gmail:thread:abc',
      envelope: e,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'resource_in_protected_files');
  });

  it('allows write when key is in modify_files', () => {
    const e = env({
      review_files: ['gmail:message:x'],
      modify_files: ['gmail:message:x'],
    });
    const r = validateScopeOperation({
      operation: 'write',
      resourceKey: 'gmail:message:x',
      envelope: e,
    });
    assert.equal(r.allowed, true);
  });

  it('denies write when key is review-only', () => {
    const e = env({
      review_files: ['gmail:message:x'],
      modify_files: [],
    });
    const r = validateScopeOperation({
      operation: 'write',
      resourceKey: 'gmail:message:x',
      envelope: e,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'write_to_review_only_path');
  });
});

describe('routingEnvelopeToScopeTarget', () => {
  it('maps thread.read to read + gmail:thread key', () => {
    const t = routingEnvelopeToScopeTarget(
      minimalEnvelope({
        intent: 'workspace.mail.thread.read',
        policy_context: { scope_class: 'workspace.google.read' },
        resource_ref: { type: 'thread', id: '  th-99  ' },
      }),
    );
    assert.equal(t.ok, true);
    if (t.ok) {
      assert.equal(t.operation, 'read');
      assert.equal(t.resourceKey, gmailThreadKey('th-99'));
    }
  });

  it('fails thread.read without resource id', () => {
    const t = routingEnvelopeToScopeTarget(
      minimalEnvelope({
        intent: 'workspace.mail.thread.read',
        policy_context: { scope_class: 'workspace.google.read' },
        resource_ref: { type: 'thread' },
      }),
    );
    assert.equal(t.ok, false);
  });

  it('maps draft_reply to write + gmail:message key', () => {
    const t = routingEnvelopeToScopeTarget(
      minimalEnvelope({
        intent: 'workspace.mail.draft_reply',
        policy_context: { scope_class: 'workspace.google.write' },
        resource_ref: { type: 'message', id: 'msg-1' },
      }),
    );
    assert.equal(t.ok, true);
    if (t.ok) {
      assert.equal(t.operation, 'write');
      assert.equal(t.resourceKey, gmailMessageKey('msg-1'));
    }
  });

  it('maps calendar.list to read + fixed list key', () => {
    const t = routingEnvelopeToScopeTarget(
      minimalEnvelope({
        intent: 'workspace.calendar.list',
        policy_context: { scope_class: 'workspace.google.read' },
      }),
    );
    assert.equal(t.ok, true);
    if (t.ok) {
      assert.equal(t.operation, 'read');
      assert.equal(t.resourceKey, GCAL_LIST_CALENDARS_KEY);
    }
  });

  it('maps calendar.get to read + gcal:event key', () => {
    const t = routingEnvelopeToScopeTarget(
      minimalEnvelope({
        intent: 'workspace.calendar.get',
        policy_context: { scope_class: 'workspace.google.read' },
        resource_ref: { type: 'calendar_event', id: 'evt-42' },
      }),
    );
    assert.equal(t.ok, true);
    if (t.ok) {
      assert.equal(t.resourceKey, gcalEventKey('evt-42'));
    }
  });

  it('maps calendar.events.list to read + gcal:events window key', () => {
    const tmin = '2026-04-01T00:00:00.000Z';
    const tmax = '2026-04-08T23:59:59.999Z';
    const t = routingEnvelopeToScopeTarget(
      minimalEnvelope({
        intent: 'workspace.calendar.events.list',
        policy_context: { scope_class: 'workspace.google.read' },
        resource_ref: { type: 'calendar', id: 'primary' },
        calendar_time_range: { time_min: tmin, time_max: tmax },
      }),
    );
    assert.equal(t.ok, true);
    if (t.ok) {
      assert.equal(t.operation, 'read');
      assert.equal(t.resourceKey, gcalEventsWindowKey('primary', tmin, tmax));
    }
  });

  it('fails calendar.events.list without time range', () => {
    const t = routingEnvelopeToScopeTarget(
      minimalEnvelope({
        intent: 'workspace.calendar.events.list',
        policy_context: { scope_class: 'workspace.google.read' },
        resource_ref: { type: 'calendar', id: 'primary' },
      }),
    );
    assert.equal(t.ok, false);
  });

  it('fails for unmapped intent when envelope would need routing', () => {
    const t = routingEnvelopeToScopeTarget(
      minimalEnvelope({
        intent: 'workspace.mail.search',
        policy_context: { scope_class: 'workspace.google.read' },
        query: 'test',
      }),
    );
    assert.equal(t.ok, false);
    if (!t.ok) {
      assert.ok(t.message.includes('no SPEC-010 routing mapping'));
    }
  });
});

describe('buildExecutionScope outputs', () => {
  it('thread read: review contains thread key, empty modify', () => {
    const s = buildMailThreadReadScope('tid-1');
    assert.equal(s.schema_version, '1.0');
    assert.equal(s.scope_confidence, 'high');
    assert.ok(s.scope_rationale.length >= 1);
    assert.deepEqual(s.scope.modify_files, []);
    assert.deepEqual(s.scope.review_files, [gmailThreadKey('tid-1')]);
    assert.ok(s.plan_id.length > 0);
  });

  it('summarize: same review surface as thread read for same id', () => {
    const a = buildMailThreadSummarizeScope('tid-2');
    const b = buildMailThreadReadScope('tid-2');
    assert.deepEqual(a.scope.review_files, b.scope.review_files);
    assert.deepEqual(a.scope.modify_files, []);
  });

  it('draft reply: message in modify_files; optional thread in review', () => {
    const s = buildMailDraftReplyScope('mid-1', 'tid-3');
    assert.ok(s.scope.modify_files.includes(gmailMessageKey('mid-1')));
    assert.ok(s.scope.review_files.includes(gmailMessageKey('mid-1')));
    assert.ok(s.scope.review_files.includes(gmailThreadKey('tid-3')));
  });

  it('draft reply without thread: message only in review', () => {
    const s = buildMailDraftReplyScope('mid-2');
    assert.deepEqual(s.scope.review_files, [gmailMessageKey('mid-2')]);
  });

  it('calendar list: fixed logical key in review', () => {
    const s = buildCalendarListScope();
    assert.deepEqual(s.scope.review_files, [GCAL_LIST_CALENDARS_KEY]);
    assert.deepEqual(s.scope.modify_files, []);
  });

  it('calendar get: event id in review', () => {
    const s = buildCalendarGetScope('ev-9');
    assert.deepEqual(s.scope.review_files, [gcalEventKey('ev-9')]);
  });

  it('calendar events list: window key in review', () => {
    const tmin = '2026-04-01T00:00:00.000Z';
    const tmax = '2026-04-08T23:59:59.999Z';
    const s = buildCalendarEventsListScope('cal@x', tmin, tmax);
    assert.deepEqual(s.scope.review_files, [gcalEventsWindowKey('cal@x', tmin, tmax)]);
  });
});

describe('scopeMetrics', () => {
  beforeEach(() => {
    resetScopeMetricsForTests();
  });

  it('increments scope check counters', () => {
    recordScopeCheck('allowed');
    recordScopeCheck('allowed');
    recordScopeCheck('denied');
    recordScopeCheck('routing_invalid');
    const m = getScopeMetricsSnapshot();
    assert.equal(m.scopeCheckAllowed, 2);
    assert.equal(m.scopeCheckDenied, 1);
    assert.equal(m.scopeRoutingInvalid, 1);
  });

  it('records summarize bounded context and averages', () => {
    recordThreadSummarizeBoundedContext({ threadPayloadChars: 100, boundedPromptChars: 500 });
    recordThreadSummarizeBoundedContext({ threadPayloadChars: 200, boundedPromptChars: 700 });
    const m = getScopeMetricsSnapshot();
    assert.equal(m.lastSummarizeThreadPayloadChars, 200);
    assert.equal(m.lastSummarizeBoundedPromptChars, 700);
    assert.equal(m.summarizeBoundedPromptAvgChars, 600);
  });
});
