/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyShellNavigationAction,
  getShellNavigationDenialMessage,
  shellStateCommandToNavigationAction,
  tryApplyShellNavigationAction,
} from './shellNavigationApply';

describe('shellStateCommandToNavigationAction', () => {
  it('maps surface and app_mode commands', () => {
    assert.deepEqual(shellStateCommandToNavigationAction({ type: 'surface', mode: 'operator' }), {
      type: 'set_surface_mode',
      mode: 'operator',
    });
    assert.deepEqual(shellStateCommandToNavigationAction({ type: 'app_mode', mode: 'chat' }), {
      type: 'set_voice_chat_mode',
      mode: 'chat',
    });
  });
});

describe('getShellNavigationDenialMessage', () => {
  it('returns null for voice/chat shell action', () => {
    assert.equal(
      getShellNavigationDenialMessage(
        { type: 'set_voice_chat_mode', mode: 'chat' },
        { operatorEligible: false, developerEligible: false },
      ),
      null,
    );
  });

  it('denies operator surface without eligibility', () => {
    const msg = getShellNavigationDenialMessage(
      { type: 'set_surface_mode', mode: 'operator' },
      { operatorEligible: false, developerEligible: false },
    );
    assert.equal(typeof msg, 'string');
    assert.ok(msg && msg.length > 0);
  });
});

describe('tryApplyShellNavigationAction', () => {
  it('applies set_voice_chat_mode', () => {
    let seen: 'voice' | 'chat' | null = null;
    const r = tryApplyShellNavigationAction(
      { type: 'set_voice_chat_mode', mode: 'chat' },
      { operatorEligible: false, developerEligible: false },
      {
        setSurfaceMode: () => {
          throw new Error('unexpected surface');
        },
        setVoiceChatMode: (m) => {
          seen = m;
        },
        setAppTargetMode: () => {
          throw new Error('unexpected app mode');
        },
        openWorkspace: () => {
          throw new Error('unexpected workspace');
        },
      },
    );
    assert.equal(r.ok, true);
    assert.equal(seen, 'chat');
  });

  it('does not apply surface when denied', () => {
    let surfaceCalls = 0;
    const r = tryApplyShellNavigationAction(
      { type: 'set_surface_mode', mode: 'operator' },
      { operatorEligible: false, developerEligible: false },
      {
        setSurfaceMode: () => {
          surfaceCalls += 1;
        },
        setVoiceChatMode: () => {
          throw new Error('unexpected');
        },
        setAppTargetMode: () => {
          throw new Error('unexpected');
        },
        openWorkspace: () => {
          throw new Error('unexpected');
        },
      },
    );
    assert.equal(r.ok, false);
    assert.equal(surfaceCalls, 0);
  });
});

describe('applyShellNavigationAction', () => {
  it('routes set_mode to setAppTargetMode', () => {
    let target: string | null = null;
    applyShellNavigationAction(
      { type: 'set_mode', mode: 'voice_settings' },
      {
        setSurfaceMode: () => {
          throw new Error('unexpected');
        },
        setVoiceChatMode: () => {
          throw new Error('unexpected');
        },
        setAppTargetMode: (m) => {
          target = m;
        },
        openWorkspace: () => {
          throw new Error('unexpected');
        },
      },
    );
    assert.equal(target, 'voice_settings');
  });
});
