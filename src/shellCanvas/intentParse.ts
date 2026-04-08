/**
 * Structured intent from agent output (INTENT_JSON line). Workspace intents only.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { isPhase1WorkspaceIntent } from '../workspace/intentRegistry';
import type { ParsedWorkspaceIntent } from '../workspace/workspaceIntentRouter';

export function extractIntentJsonObject(text: string): Record<string, unknown> | null {
  const marker = 'INTENT_JSON:';
  const idx = text.lastIndexOf(marker);
  if (idx === -1) return null;
  const after = text.slice(idx + marker.length).trim();
  const start = after.indexOf('{');
  const end = after.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(after.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type IntentParseSource = 'json' | 'none';

export type AgentIntentParseResult =
  | { kind: 'workspace'; parsed: ParsedWorkspaceIntent; source: 'json' }
  | { kind: 'none'; source: IntentParseSource };

/**
 * Parse agent text for Workspace Phase-1 intents only. App intents and legacy document intents are ignored here.
 */
export function parseAgentIntentDetailed(agentText: string): AgentIntentParseResult {
  const raw = extractIntentJsonObject(agentText);
  if (raw && typeof raw.intent === 'string' && raw.intent.startsWith('app.')) {
    return { kind: 'none', source: 'json' };
  }
  // Historical intent namespace from removed doc-canvas experiment — never routed in shell.
  if (raw && typeof raw.intent === 'string' && raw.intent.startsWith('governance.')) {
    return { kind: 'none', source: 'json' };
  }
  if (raw && typeof raw.intent === 'string' && raw.intent.startsWith('workspace.')) {
    if (isPhase1WorkspaceIntent(raw.intent)) {
      return {
        kind: 'workspace',
        source: 'json',
        parsed: {
          intent: raw.intent,
          query: typeof raw.query === 'string' ? raw.query : undefined,
          resource_id: typeof raw.resource_id === 'string' ? raw.resource_id : undefined,
        },
      };
    }
    return { kind: 'none', source: 'json' };
  }
  return { kind: 'none', source: 'none' };
}

/** Remove INTENT_JSON block so chat / TTS stay conversational. */
export function stripIntentLineForDisplay(agentText: string): string {
  const marker = 'INTENT_JSON:';
  const idx = agentText.lastIndexOf(marker);
  if (idx === -1) return agentText.trim();
  return agentText.slice(0, idx).trim();
}
