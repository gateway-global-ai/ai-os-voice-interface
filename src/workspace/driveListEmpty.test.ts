/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { workspaceDriveListDataIsEmpty } from './driveListEmpty';

describe('workspaceDriveListDataIsEmpty', () => {
  it('treats null as empty', () => {
    assert.equal(workspaceDriveListDataIsEmpty(null), true);
  });

  it('detects empty files array (Drive API shape)', () => {
    assert.equal(workspaceDriveListDataIsEmpty({ files: [] }), true);
  });

  it('detects non-empty files', () => {
    assert.equal(workspaceDriveListDataIsEmpty({ files: [{ id: 'a', name: 'x' }] }), false);
  });

  it('unwraps nested data.files', () => {
    assert.equal(workspaceDriveListDataIsEmpty({ data: { files: [] } }), true);
  });

  it('returns false for unknown object without list keys (show raw ok)', () => {
    assert.equal(workspaceDriveListDataIsEmpty({ foo: 1 }), false);
  });
});
