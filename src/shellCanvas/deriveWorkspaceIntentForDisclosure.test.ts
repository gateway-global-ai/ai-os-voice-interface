/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deriveWorkspaceIntentForDisclosure } from './deriveWorkspaceIntentForDisclosure.js';

describe('deriveWorkspaceIntentForDisclosure', () => {
  it('returns null without canvas', () => {
    assert.equal(deriveWorkspaceIntentForDisclosure(null, null), null);
  });

  it('maps calendar hub', () => {
    assert.equal(
      deriveWorkspaceIntentForDisclosure(
        { view: 'workspace_calendar_hub' },
        {
          view: 'workspace_calendar_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          calendarRead: { loadState: 'ok', data: {} },
        },
      ),
      'workspace.calendar.list',
    );
  });

  it('maps mail hub to search when no successful read', () => {
    assert.equal(
      deriveWorkspaceIntentForDisclosure(
        { view: 'workspace_mail_hub' },
        {
          view: 'workspace_mail_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          mailSearch: { loadState: 'ok', data: {} },
        },
      ),
      'workspace.mail.search',
    );
  });

  it('maps mail hub to read when mailRead ok', () => {
    assert.equal(
      deriveWorkspaceIntentForDisclosure(
        { view: 'workspace_mail_hub' },
        {
          view: 'workspace_mail_hub',
          phase: 1,
          specRef: 'AIOS-SPEC-007',
          mailSearch: { loadState: 'ok', data: {} },
          mailRead: { loadState: 'ok', data: { id: 'm1' } },
        },
      ),
      'workspace.mail.read',
    );
  });
});
