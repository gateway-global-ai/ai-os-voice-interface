/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractJsonObjectText, normalizeThreadSummaryV1, parseThreadSummaryV1FromLlm } from './threadSummaryV1';

describe('threadSummaryV1', () => {
  it('parses plain JSON', () => {
    const r = parseThreadSummaryV1FromLlm(
      '{"summary":"Hi","requestedAction":null,"openQuestions":[],"datesCommitments":[],"suggestedNextStep":null}',
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.summary, 'Hi');
      assert.equal(r.value.requestedAction, null);
    }
  });

  it('extracts JSON from fenced block', () => {
    const r = parseThreadSummaryV1FromLlm(
      'Here:\n```json\n{"summary":"x","requestedAction":null,"openQuestions":["q?"],"datesCommitments":[],"suggestedNextStep":null}\n```',
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.openQuestions, ['q?']);
  });

  it('extractJsonObjectText finds object in prose', () => {
    const t = extractJsonObjectText('Prefix\n{"summary":"a","requestedAction":null,"openQuestions":[],"datesCommitments":[],"suggestedNextStep":null}\nSuffix');
    assert.ok(t?.includes('"summary"'));
  });

  it('fails on invalid JSON', () => {
    const r = parseThreadSummaryV1FromLlm('not json');
    assert.equal(r.ok, false);
  });

  it('fails when root is array', () => {
    const r = normalizeThreadSummaryV1([]);
    assert.equal(r.ok, false);
  });

  it('coerces types safely', () => {
    const r = normalizeThreadSummaryV1({
      summary: 42,
      requestedAction: '  reply  ',
      openQuestions: ['a', 2],
      datesCommitments: 'bad',
      suggestedNextStep: '',
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.summary, '42');
      assert.equal(r.value.requestedAction, 'reply');
      assert.deepEqual(r.value.openQuestions, ['a', '2']);
      assert.deepEqual(r.value.datesCommitments, []);
      assert.equal(r.value.suggestedNextStep, null);
    }
  });
});
