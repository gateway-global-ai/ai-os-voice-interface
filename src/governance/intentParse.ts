/**
 * Structured intent from agent output (INTENT_JSON line) + legacy phrase fallback.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { GovernanceIntentId, ParsedGovernanceIntent } from './canvasTypes';

const VALID: GovernanceIntentId[] = [
  'none',
  'governance.documents.list',
  'governance.documents.open',
  'governance.amendment.workflow',
  'governance.conflicts.scan',
  'governance.compliance.check',
  'governance.lifecycle.status',
  'governance.action_plan.review',
];

function isIntentId(s: string): s is GovernanceIntentId {
  return VALID.includes(s as GovernanceIntentId);
}

function extractIntentJsonObject(text: string): Record<string, unknown> | null {
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

function legacyPhraseParse(agentText: string): ParsedGovernanceIntent | null {
  if (agentText.includes('display the governance dashboard')) {
    return { intent: 'governance.documents.list' };
  }
  if (agentText.includes('run a conflict scan')) {
    return { intent: 'governance.conflicts.scan' };
  }
  if (agentText.includes('display the compliance checker')) {
    return { intent: 'governance.compliance.check' };
  }
  if (agentText.includes('open that document')) {
    return { intent: 'governance.documents.list' };
  }
  if (agentText.includes('show the lifecycle status')) {
    return { intent: 'governance.lifecycle.status' };
  }
  if (
    agentText.includes('amendment program') ||
    agentText.includes('amendment workflow') ||
    agentText.includes('open the amendment')
  ) {
    return { intent: 'governance.amendment.workflow' };
  }
  return null;
}

export type IntentParseSource = 'json' | 'legacy' | 'none';

/** Parse INTENT_JSON (preferred) or legacy phrases; includes source for audit. */
export function parseIntentFromAgentTextDetailed(agentText: string): {
  parsed: ParsedGovernanceIntent | null;
  source: IntentParseSource;
} {
  const raw = extractIntentJsonObject(agentText);
  if (raw && typeof raw.intent === 'string' && isIntentId(raw.intent)) {
    return {
      parsed: {
        intent: raw.intent,
        document_id: typeof raw.document_id === 'string' ? raw.document_id : undefined,
      },
      source: 'json',
    };
  }

  const legacy = legacyPhraseParse(agentText);
  if (legacy) {
    return { parsed: legacy, source: 'legacy' };
  }

  return { parsed: null, source: 'none' };
}

/** Parse INTENT_JSON from full agent message (preferred) or legacy phrases. */
export function parseIntentFromAgentText(agentText: string): ParsedGovernanceIntent | null {
  return parseIntentFromAgentTextDetailed(agentText).parsed;
}

/** Remove INTENT_JSON block so chat / TTS stay conversational. */
export function stripIntentLineForDisplay(agentText: string): string {
  const marker = 'INTENT_JSON:';
  const idx = agentText.lastIndexOf(marker);
  if (idx === -1) return agentText.trim();
  return agentText.slice(0, idx).trim();
}
