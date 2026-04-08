/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolvedIntentRequiresLocalModel } from './localInterpretationRequired.js';

describe('resolvedIntentRequiresLocalModel', () => {
  it('is false for null/undefined', () => {
    assert.equal(resolvedIntentRequiresLocalModel(null), false);
    assert.equal(resolvedIntentRequiresLocalModel(undefined), false);
  });

  it('is false for typical read intents', () => {
    assert.equal(resolvedIntentRequiresLocalModel('workspace.mail.read'), false);
    assert.equal(resolvedIntentRequiresLocalModel('workspace.calendar.list'), false);
  });

  it('is true for thread summarize', () => {
    assert.equal(resolvedIntentRequiresLocalModel('workspace.mail.thread.summarize'), true);
  });
});
