/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { workspaceIntentToCanvasView, workspaceMailReadMessageIdFromIntent } from './workspaceIntentRouter';

describe('workspaceMailReadMessageIdFromIntent', () => {
  it('returns message id only for workspace.mail.read', () => {
    assert.equal(
      workspaceMailReadMessageIdFromIntent({
        intent: 'workspace.mail.read',
        resource_id: 'msg-abc',
      }),
      'msg-abc'
    );
  });

  it('returns undefined for workspace.mail.search even if resource_id is set', () => {
    assert.equal(
      workspaceMailReadMessageIdFromIntent({
        intent: 'workspace.mail.search',
        resource_id: 'should-not-treat-as-message',
        query: 'in:inbox',
      }),
      undefined
    );
  });

  it('returns undefined for workspace.mail.thread.read (thread id, not message id)', () => {
    assert.equal(
      workspaceMailReadMessageIdFromIntent({
        intent: 'workspace.mail.thread.read',
        resource_id: 'thread-xyz',
      }),
      undefined
    );
  });
});

describe('workspaceIntentToCanvasView', () => {
  it('maps workspace.drive.list to workspace_drive_hub', () => {
    assert.deepEqual(workspaceIntentToCanvasView({ intent: 'workspace.drive.list' }), {
      view: 'workspace_drive_hub',
    });
  });
});
