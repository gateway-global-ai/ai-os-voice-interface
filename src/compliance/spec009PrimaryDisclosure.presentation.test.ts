/**
 * Presentation-layer tests for §12.2 secondary line (interface shell labels).
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LocalModelReadiness } from '../local-llm/types';
import { buildPrimarySecondaryDisclosureLine } from './spec009PrimaryDisclosure';

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

test('secondary line includes workspace and voice notes', () => {
  const line = buildPrimarySecondaryDisclosureLine({
    workspaceState: 'not_configured',
    voiceInputAvailable: false,
    shellInteractionMode: 'voice',
  });
  assert.match(line, /Google Workspace/);
  assert.match(line, /Voice input unavailable/);
});

test('secondary line adds capability when local required and degraded', () => {
  const line = buildPrimarySecondaryDisclosureLine({
    workspaceState: 'connected',
    voiceInputAvailable: true,
    shellInteractionMode: 'chat',
    resolvedIntentRequiresLocalModel: true,
    localModelReadiness: { ...baseLocal, status: 'degraded' },
  });
  assert.match(line, /Local model: degraded/);
});
