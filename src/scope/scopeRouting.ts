/**
 * Map WorkspaceRoutingEnvelope + intent to a canonical resource key and operation for SPEC-010 checks.
 * Extend this table as more intents get execution_scope.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { WorkspaceRoutingEnvelope } from '../workspace/types';
import {
  GCAL_LIST_CALENDARS_KEY,
  gcalEventKey,
  gcalEventsWindowKey,
  gmailMessageKey,
  gmailThreadKey,
} from './resourceKeys';
import type { ScopeOperation } from './validateScope';

export type RoutedScopeTarget =
  | { ok: true; operation: ScopeOperation; resourceKey: string }
  | { ok: false; message: string };

/**
 * When `execution_scope` is set, we must be able to derive a single resource key for the call.
 */
export function routingEnvelopeToScopeTarget(envelope: WorkspaceRoutingEnvelope): RoutedScopeTarget {
  const { intent } = envelope;

  switch (intent) {
    case 'workspace.calendar.list':
      return { ok: true, operation: 'read', resourceKey: GCAL_LIST_CALENDARS_KEY };

    case 'workspace.calendar.events.list': {
      const calId = envelope.resource_ref?.id?.trim() || envelope.resource_ref?.calendarId?.trim() || 'primary';
      const tr = envelope.calendar_time_range;
      if (!tr?.time_min?.trim() || !tr?.time_max?.trim()) {
        return {
          ok: false,
          message:
            'workspace.calendar.events.list requires calendar_time_range.time_min and time_max (RFC3339).',
        };
      }
      return {
        ok: true,
        operation: 'read',
        resourceKey: gcalEventsWindowKey(calId, tr.time_min, tr.time_max),
      };
    }

    case 'workspace.calendar.get': {
      const id = envelope.resource_ref?.id?.trim();
      if (!id) {
        return {
          ok: false,
          message: 'workspace.calendar.get requires resource_ref.id (calendar event id).',
        };
      }
      return { ok: true, operation: 'read', resourceKey: gcalEventKey(id) };
    }

    case 'workspace.mail.thread.read': {
      const id = envelope.resource_ref?.id?.trim();
      if (!id) {
        return { ok: false, message: 'workspace.mail.thread.read requires resource_ref.id (thread id).' };
      }
      return { ok: true, operation: 'read', resourceKey: gmailThreadKey(id) };
    }
    case 'workspace.mail.draft_reply': {
      const id = envelope.resource_ref?.id?.trim();
      if (!id) {
        return { ok: false, message: 'workspace.mail.draft_reply requires resource_ref.id (message id).' };
      }
      return { ok: true, operation: 'write', resourceKey: gmailMessageKey(id) };
    }
    default:
      return {
        ok: false,
        message: `execution_scope is set but intent "${intent}" has no SPEC-010 routing mapping yet.`,
      };
  }
}
