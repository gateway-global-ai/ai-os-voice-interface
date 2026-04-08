/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deriveShellPrimaryOutcome } from './shellPrimaryOutcome.js';

describe('deriveShellPrimaryOutcome (AMD-2026-012 §7)', () => {
  it('idle shell without canvas → ready_for_intent', () => {
    assert.equal(
      deriveShellPrimaryOutcome({
        canvasView: null,
        agentPhase: 'idle',
      }),
      'ready_for_intent',
    );
  });

  it('workspace onboarding → needs_auth', () => {
    assert.equal(
      deriveShellPrimaryOutcome({
        canvasView: 'workspace_onboarding',
        agentPhase: 'idle',
      }),
      'needs_auth',
    );
  });

  it('agent processing with no canvas → ready_to_execute', () => {
    assert.equal(
      deriveShellPrimaryOutcome({
        canvasView: null,
        agentPhase: 'processing',
      }),
      'ready_to_execute',
    );
  });

  it('hub visible, agent idle → executed_with_result', () => {
    assert.equal(
      deriveShellPrimaryOutcome({
        canvasView: 'workspace_hub',
        agentPhase: 'idle',
      }),
      'executed_with_result',
    );
  });

  it('agent error → execution_failed', () => {
    assert.equal(
      deriveShellPrimaryOutcome({
        canvasView: null,
        agentPhase: 'error',
      }),
      'execution_failed',
    );
  });
});
