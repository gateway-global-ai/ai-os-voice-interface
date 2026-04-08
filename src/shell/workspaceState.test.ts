/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldShowWorkspaceHub } from './workspaceState';

describe('shouldShowWorkspaceHub (#14)', () => {
  it('allows hub for connected and auth_required only', () => {
    assert.equal(shouldShowWorkspaceHub('connected'), true);
    assert.equal(shouldShowWorkspaceHub('auth_required'), true);
    assert.equal(shouldShowWorkspaceHub('unknown'), false);
    assert.equal(shouldShowWorkspaceHub('not_configured'), false);
    assert.equal(shouldShowWorkspaceHub('connecting'), false);
    assert.equal(shouldShowWorkspaceHub('error'), false);
  });
});
