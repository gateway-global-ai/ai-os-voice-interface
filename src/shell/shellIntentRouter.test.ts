/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { routeShellAgentText } from './shellIntentRouter';

const line = (obj: Record<string, unknown>) =>
  `Done.\nINTENT_JSON:${JSON.stringify(obj)}`;

describe('routeShellAgentText app.shell.*', () => {
  it('applies enter_operator without delegating canvas routing', () => {
    const r = routeShellAgentText(line({ intent: 'app.shell.enter_operator' }));
    assert.equal(r.delegateWorkspaceCanvas, false);
    assert.deepEqual(r.action, { type: 'set_surface_mode', mode: 'operator' });
  });

  it('applies surface_mode with surface field', () => {
    const r = routeShellAgentText(line({ intent: 'app.shell.surface_mode', surface: 'developer' }));
    assert.equal(r.delegateWorkspaceCanvas, false);
    assert.deepEqual(r.action, { type: 'set_surface_mode', mode: 'developer' });
  });

  it('applies switch_to_chat', () => {
    const r = routeShellAgentText(line({ intent: 'app.shell.switch_to_chat' }));
    assert.equal(r.delegateWorkspaceCanvas, false);
    assert.deepEqual(r.action, { type: 'set_voice_chat_mode', mode: 'chat' });
  });

  it('does not delegate canvas for unknown app.shell.*', () => {
    const r = routeShellAgentText(line({ intent: 'app.shell.unknown_future' }));
    assert.equal(r.delegateWorkspaceCanvas, false);
    assert.equal(r.action.type, 'none');
  });

  it('does not delegate canvas for unrecognized app.open.*', () => {
    const r = routeShellAgentText(line({ intent: 'app.open.unknown' }));
    assert.equal(r.delegateWorkspaceCanvas, false);
    assert.equal(r.action.type, 'none');
  });

  it('delegates workspace intents to canvas router', () => {
    const r = routeShellAgentText(line({ intent: 'workspace.hub' }));
    assert.equal(r.delegateWorkspaceCanvas, true);
  });
});
