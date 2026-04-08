/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tryParseShellStateCommand } from './shellStateCommands';

describe('tryParseShellStateCommand', () => {
  it('parses surface modes', () => {
    assert.deepEqual(tryParseShellStateCommand('developer mode'), {
      type: 'surface',
      mode: 'developer',
    });
    assert.deepEqual(tryParseShellStateCommand('enter operator mode'), {
      type: 'surface',
      mode: 'operator',
    });
    assert.deepEqual(tryParseShellStateCommand('exit diagnostics'), {
      type: 'surface',
      mode: 'primary',
    });
  });

  it('parses voice/chat', () => {
    assert.deepEqual(tryParseShellStateCommand('switch to chat'), {
      type: 'app_mode',
      mode: 'chat',
    });
    assert.deepEqual(tryParseShellStateCommand('switch to voice'), {
      type: 'app_mode',
      mode: 'voice',
    });
  });

  it('returns null for normal sentences', () => {
    assert.equal(tryParseShellStateCommand('open my mail'), null);
  });
});
