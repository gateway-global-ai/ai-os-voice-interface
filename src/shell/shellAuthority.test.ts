/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  allowShellSurfaceTransition,
  clampSurfaceModeToInterimAuthority,
  INTERIM_SHELL_OPERATOR_UNLOCK_KEY,
  readInterimShellAuthority,
  SHELL_AUTHORITY_DENIED_DEVELOPER,
  SHELL_AUTHORITY_DENIED_OPERATOR,
} from './shellAuthority';
import { LEGACY_SHELL_DIAG_KEY, LEGACY_SHELL_OP_KEY } from './shellChromeVisibility';

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

describe('allowShellSurfaceTransition', () => {
  it('allows primary always', () => {
    const r = allowShellSurfaceTransition('primary', {
      operatorEligible: false,
      developerEligible: false,
    });
    assert.equal(r.ok, true);
  });

  it('denies operator without eligibility', () => {
    const r = allowShellSurfaceTransition('operator', {
      operatorEligible: false,
      developerEligible: true,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.userMessage, SHELL_AUTHORITY_DENIED_OPERATOR);
  });

  it('allows operator when eligible', () => {
    const r = allowShellSurfaceTransition('operator', {
      operatorEligible: true,
      developerEligible: false,
    });
    assert.equal(r.ok, true);
  });

  it('denies developer without eligibility', () => {
    const r = allowShellSurfaceTransition('developer', {
      operatorEligible: false,
      developerEligible: false,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.userMessage, SHELL_AUTHORITY_DENIED_DEVELOPER);
  });

  it('allows developer when developerEligible', () => {
    const r = allowShellSurfaceTransition('developer', {
      operatorEligible: false,
      developerEligible: true,
    });
    assert.equal(r.ok, true);
  });
});

describe('clampSurfaceModeToInterimAuthority', () => {
  it('maps denied elevated to primary', () => {
    assert.equal(
      clampSurfaceModeToInterimAuthority('operator', {
        operatorEligible: false,
        developerEligible: false,
      }),
      'primary',
    );
  });
});

describe('readInterimShellAuthority', () => {
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

  it('treats URL aios_operator as operator elevation', () => {
    (globalThis.window as unknown as { location: { search: string } }).location.search =
      '?aios_operator=1';
    const a = readInterimShellAuthority();
    assert.equal(a.operatorEligible, true);
    assert.equal(a.developerEligible, true);
  });

  it('treats URL aios_dev as developer elevation', () => {
    (globalThis.window as unknown as { location: { search: string } }).location.search =
      '?aios_dev=1';
    const a = readInterimShellAuthority();
    assert.equal(a.developerEligible, true);
  });

  it('treats legacy operator storage as operator elevation', () => {
    sessionStorage.setItem(LEGACY_SHELL_OP_KEY, '1');
    const a = readInterimShellAuthority();
    assert.equal(a.operatorEligible, true);
  });

  it('treats interim operator unlock as operator elevation', () => {
    sessionStorage.setItem(INTERIM_SHELL_OPERATOR_UNLOCK_KEY, '1');
    const a = readInterimShellAuthority();
    assert.equal(a.operatorEligible, true);
  });

  it('treats legacy diagnostics only as developer elevation (and operator via legacy hint)', () => {
    sessionStorage.setItem(LEGACY_SHELL_DIAG_KEY, '1');
    const a = readInterimShellAuthority();
    assert.equal(a.operatorEligible, true);
    assert.equal(a.developerEligible, true);
  });
});
