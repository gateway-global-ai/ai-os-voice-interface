/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  readSessionEntryClassification,
  markSessionEntryEngaged,
} from './sessionEntryClassification.js';

function makeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
}

describe('sessionEntryClassification (AMD-2026-012 §5)', () => {
  const origWindow = globalThis.window;
  const origLocal = globalThis.localStorage;

  beforeEach(() => {
    globalThis.localStorage = makeStorage();
    globalThis.window = {} as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = origWindow;
    globalThis.localStorage = origLocal;
  });

  it('classifies as new when no prior engagement', () => {
    assert.equal(readSessionEntryClassification(), 'new');
  });

  it('classifies as returning after markSessionEntryEngaged', () => {
    assert.equal(readSessionEntryClassification(), 'new');
    markSessionEntryEngaged();
    assert.equal(readSessionEntryClassification(), 'returning');
  });
});
