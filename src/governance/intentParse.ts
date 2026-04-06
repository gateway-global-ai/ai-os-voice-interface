/**
 * Structured intent from agent output (INTENT_JSON line) + legacy phrase fallback.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { GovernanceIntentId, ParsedGovernanceIntent } from './canvasTypes';
import { isPhase1WorkspaceIntent } from '../workspace/intentRegistry';
import type { ParsedWorkspaceIntent } from '../workspace/workspaceIntentRouter';

const VALID: GovernanceIntentId[] = [
  'none',
  'governance.documents.list',
  'governance.documents.open',
  'governance.amendment.workflow',
  'governance.amendment.hub',
  'governance.amendment.resume',
  'governance.amendment.review',
  'governance.amendment.create',
  'governance.conflicts.scan',
  'governance.compliance.check',
  'governance.lifecycle.status',
  'governance.action_plan.review',
];

function isIntentId(s: string): s is GovernanceIntentId {
  return VALID.includes(s as GovernanceIntentId);
}

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

function legacyPhraseParse(agentText: string): ParsedGovernanceIntent | null {
  /** Pre–Workplace Track B: governed navigation must not depend on phrase matching in production. */
  if (import.meta.env.PROD) return null;
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
    return { intent: 'governance.amendment.hub' };
  }
  return null;
}

export type IntentParseSource = 'json' | 'legacy' | 'none';

export type AgentIntentParseResult =
  | { kind: 'governance'; parsed: ParsedGovernanceIntent; source: IntentParseSource }
  | { kind: 'workspace'; parsed: ParsedWorkspaceIntent; source: 'json' }
  | { kind: 'none'; source: IntentParseSource };

/**
 * Unified parse: Workspace intents (Phase 1) take precedence when INTENT_JSON uses `workspace.*`.
 */
export function parseAgentIntentDetailed(agentText: string): AgentIntentParseResult {
  const raw = extractIntentJsonObject(agentText);
  if (raw && typeof raw.intent === 'string' && raw.intent.startsWith('app.')) {
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
  const { parsed, source } = parseIntentFromAgentTextDetailed(agentText);
  if (!parsed || parsed.intent === 'none') return { kind: 'none', source };
  return { kind: 'governance', parsed, source };
}

/** Parse INTENT_JSON (preferred) or legacy phrases; includes source for audit. */
export function parseIntentFromAgentTextDetailed(agentText: string): {
  parsed: ParsedGovernanceIntent | null;
  source: IntentParseSource;
} {
  const raw = extractIntentJsonObject(agentText);
  if (raw && typeof raw.intent === 'string' && raw.intent.startsWith('app.')) {
    return { parsed: null, source: 'json' };
  }
  if (raw && typeof raw.intent === 'string' && isIntentId(raw.intent)) {
    const amendment_mode =
      raw.amendment_mode === 'review'
        ? 'review'
        : raw.amendment_mode === 'edit'
          ? 'edit'
          : undefined;
    return {
      parsed: {
        intent: raw.intent,
        document_id: typeof raw.document_id === 'string' ? raw.document_id : undefined,
        workflow_run_id:
          typeof raw.workflow_run_id === 'string' ? raw.workflow_run_id : undefined,
        template_id: typeof raw.template_id === 'string' ? raw.template_id : undefined,
        amendment_mode,
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
