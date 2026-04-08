/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { retrieveTopK, scoreChunk, tokenizeQuery, type TextChunk } from './uiReviewRag.ts';

describe('uiReviewRag', () => {
  it('tokenizeQuery drops stopwords', () => {
    const t = tokenizeQuery('the shell workspace intent routing');
    assert.ok(t.includes('shell'));
    assert.ok(!t.includes('the'));
  });

  it('scoreChunk ranks relevant chunk higher', () => {
    const q = tokenizeQuery('workspace hub shell disclosure');
    const a = 'The workspace hub opens from the shell menu.';
    const b = 'Unrelated text about weather.';
    assert.ok(scoreChunk(q, a) > scoreChunk(q, b));
  });

  it('retrieveTopK returns ordered chunks', () => {
    const chunks: TextChunk[] = [
      { id: '1', sourcePath: 'a.md', text: 'shell voice-first entry' },
      { id: '2', sourcePath: 'b.md', text: 'unrelated cooking recipe' },
      { id: '3', sourcePath: 'c.md', text: 'shell disclosure §12.2' },
    ];
    const r = retrieveTopK('shell disclosure voice', chunks, 2);
    assert.equal(r.length, 2);
    assert.ok(r[0].score >= r[1].score);
  });
});
