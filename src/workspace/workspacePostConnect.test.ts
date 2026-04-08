/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { workspaceViewAfterConnect } from './workspacePostConnect';

describe('workspaceViewAfterConnect', () => {
  it('resumes calendar hub', () => {
    assert.deepEqual(workspaceViewAfterConnect('workspace_calendar_hub'), {
      view: 'workspace_calendar_hub',
      params: undefined,
    });
  });

  it('resumes mail hub with message id', () => {
    assert.deepEqual(
      workspaceViewAfterConnect('workspace_mail_hub', { mailMessageId: 'm1' }),
      { view: 'workspace_mail_hub', params: { mailMessageId: 'm1' } }
    );
  });

  it('defaults generic workspace_hub to calendar list', () => {
    assert.deepEqual(workspaceViewAfterConnect('workspace_hub'), {
      view: 'workspace_calendar_hub',
    });
  });

  it('defaults undefined view to calendar list', () => {
    assert.deepEqual(workspaceViewAfterConnect(undefined), {
      view: 'workspace_calendar_hub',
    });
  });
});
