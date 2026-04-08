/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LocalModelReadiness } from '../../local-llm/types';
import { primarySurfaceSystemStateDisclosureNeeded } from './spec009DisclosurePredicates.js';

const baseLocal: LocalModelReadiness = {
  status: 'running_ready',
  runtime: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  models: ['llama'],
  requiredModels: [],
  missingModels: [],
  lastCheckedAt: 't',
  fallbackPolicy: 'proposal',
  localLlmEnabled: true,
};

test('disclosure needed: voice mode without voice input', () => {
  assert.equal(
    primarySurfaceSystemStateDisclosureNeeded({
      workspaceState: 'connected',
      voiceInputAvailable: false,
      shellInteractionMode: 'voice',
    }),
    true,
  );
});

test('disclosure not needed: chat mode without voice', () => {
  assert.equal(
    primarySurfaceSystemStateDisclosureNeeded({
      workspaceState: 'connected',
      voiceInputAvailable: false,
      shellInteractionMode: 'chat',
    }),
    false,
  );
});

test('disclosure needed: workspace error', () => {
  assert.equal(
    primarySurfaceSystemStateDisclosureNeeded({
      workspaceState: 'error',
      voiceInputAvailable: true,
      shellInteractionMode: 'chat',
    }),
    true,
  );
});

test('disclosure needed: workspace auth_required (execution token missing)', () => {
  assert.equal(
    primarySurfaceSystemStateDisclosureNeeded({
      workspaceState: 'auth_required',
      voiceInputAvailable: true,
      shellInteractionMode: 'chat',
    }),
    true,
  );
});

test('disclosure needed: local required but not ready', () => {
  assert.equal(
    primarySurfaceSystemStateDisclosureNeeded({
      workspaceState: 'connected',
      voiceInputAvailable: true,
      shellInteractionMode: 'chat',
      resolvedIntentRequiresLocalModel: true,
      localModelReadiness: { ...baseLocal, status: 'degraded' },
    }),
    true,
  );
});
