/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { resolveInitialSurfaceMode } from './shellBootstrap';
import { LEGACY_SHELL_DIAG_KEY } from './shellChromeVisibility';
import { SHELL_SURFACE_MODE_STORAGE_KEY } from './shellSurfaceMode';

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

describe('resolveInitialSurfaceMode (precedence)', () => {
  const origWindow = globalThis.window;
  const origSession = globalThis.sessionStorage;
  const origLocal = globalThis.localStorage;

  beforeEach(() => {
    globalThis.sessionStorage = makeStorage();
    globalThis.localStorage = makeStorage();
    globalThis.window = {
      location: { search: '' },
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = origWindow;
    globalThis.sessionStorage = origSession;
    globalThis.localStorage = origLocal;
  });

  it('prefers persisted session surface mode when interim authority allows it', () => {
    sessionStorage.setItem(LEGACY_SHELL_DIAG_KEY, '1');
    sessionStorage.setItem(SHELL_SURFACE_MODE_STORAGE_KEY, 'developer');
    assert.equal(resolveInitialSurfaceMode(), 'developer');
  });

  it('uses URL aios_operator when no persisted mode', () => {
    (globalThis.window as unknown as { location: { search: string } }).location.search =
      '?aios_operator=1';
    assert.equal(resolveInitialSurfaceMode(), 'operator');
  });

  it('defaults to primary', () => {
    assert.equal(resolveInitialSurfaceMode(), 'primary');
  });

  it('clamps persisted elevated mode without interim authority to primary', () => {
    sessionStorage.setItem(SHELL_SURFACE_MODE_STORAGE_KEY, 'operator');
    assert.equal(resolveInitialSurfaceMode(), 'primary');
  });
});
