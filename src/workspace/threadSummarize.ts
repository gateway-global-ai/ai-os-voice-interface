/**
 * workspace.mail.thread.summarize — MCP retrieval + local interpretation (POL-MODEL-003).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { InterpretationLaneTrace, LocalModelReadiness } from '../local-llm/types';
import { pickOllamaModelForSummarize } from '../local-llm/modelPick';
import {
  parseThreadSummaryV1FromLlm,
  THREAD_SUMMARY_SCHEMA_ID,
  type ThreadSummaryV1,
  type ThreadSummarySchemaId,
} from '../local-llm/threadSummaryV1';
import { fetchLocalModelReadiness, postLocalModelChat } from '../api/localModelClient';
import { runWorkspaceControlPlane } from './integrationControlPlane';
import type { WorkspaceRoutingEnvelope } from './types';
import type { ExecutionScopeEnvelope } from '../scope/executionScopeTypes';
import { buildMailThreadSummarizeScope } from '../scope/buildExecutionScope';
import { recordThreadSummarizeBoundedContext } from '../scope/scopeMetrics';

export { pickOllamaModelForSummarize } from '../local-llm/modelPick';
export type { ThreadSummaryV1, ThreadSummarySchemaId } from '../local-llm/threadSummaryV1';
export { THREAD_SUMMARY_SCHEMA_ID } from '../local-llm/threadSummaryV1';

export type ThreadSummarizeStep = {
  id: string;
  kind?: 'retrieval' | 'interpretation';
  lane?: 'local' | 'remote' | 'n/a';
  model?: string;
  fallbackUsed?: boolean;
  fallbackReason?: InterpretationLaneTrace['fallbackReason'];
  detail?: string;
};

export type ThreadSummarizeTrace = {
  readiness: LocalModelReadiness;
  steps: ThreadSummarizeStep[];
  /** Present when `threadSummaryV1` is set — use for persistence / forwarding across schema upgrades. */
  summarySchema?: ThreadSummarySchemaId;
  /** Raw model output before ThreadSummaryV1 normalization (operator / audit). */
  rawLlmResponse?: string;
  /** Normalized interpretation when successful. */
  threadSummaryV1?: ThreadSummaryV1;
};

const BASE_ENVELOPE = {
  actor_type: 'founder' as const,
  tenant_id: 'local',
  user_binding: 'browser',
  execution_mode: 'execute' as const,
};

export type ThreadSummarizeResult =
  | {
      ok: true;
      summary: ThreadSummaryV1;
      summarySchema: ThreadSummarySchemaId;
      rawLlmResponse: string;
      trace: ThreadSummarizeTrace;
    }
  | {
      ok: false;
      code:
        | 'needs_proposal'
        | 'blocked'
        | 'mcp_error'
        | 'local_error'
        | 'remote_unavailable'
        | 'no_model_tag'
        | 'interpretation_invalid';
      message: string;
      trace: ThreadSummarizeTrace;
    };

function truncateForPrompt(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… [truncated ${s.length - max} chars]`;
}

const THREAD_SUMMARY_JSON_INSTRUCTION = `You must respond with ONLY a single JSON object — no markdown fences, no commentary.
Use exactly these keys (all required):
- "summary": string — concise overview of the thread
- "requestedAction": string or null — explicit ask from another party, or null if none
- "openQuestions": array of strings — unanswered questions
- "datesCommitments": array of strings — dates, deadlines, commitments mentioned
- "suggestedNextStep": string or null — one concrete next step for the recipient, or null

Be factual; do not invent senders or dates.`;

/**
 * Load thread via MCP, then summarize with local Ollama when readiness is running_ready.
 * Remote lane is reserved for future Gemini — returns `remote_unavailable` today.
 */
export async function runThreadSummarizeGoverned(opts: {
  threadId: string;
  /** SPEC-010 envelope from the compiled plan (must match threadId). */
  executionScope?: ExecutionScopeEnvelope;
  /** When policy is `proposal` and local is not ready, pass true after user confirms cloud path. */
  cloudConfirmed?: boolean;
}): Promise<ThreadSummarizeResult> {
  const steps: ThreadSummarizeStep[] = [];
  const readiness = await fetchLocalModelReadiness();
  steps.push({ id: 'readiness', kind: 'retrieval', lane: 'n/a', detail: readiness.status });

  const execution_scope = opts.executionScope ?? buildMailThreadSummarizeScope(opts.threadId);

  const envelope: WorkspaceRoutingEnvelope = {
    ...BASE_ENVELOPE,
    intent: 'workspace.mail.thread.read',
    policy_context: { scope_class: 'workspace.google.read' },
    resource_ref: { type: 'thread', id: opts.threadId },
    execution_scope,
  };

  const cp = await runWorkspaceControlPlane(envelope, { surfaceMode: 'founder' });
  if (cp.ok === false) {
    steps.push({
      id: 'mcp.thread.read',
      kind: 'retrieval',
      lane: 'n/a',
      detail: cp.message,
    });
    return {
      ok: false,
      code: 'mcp_error',
      message: cp.message,
      trace: { readiness, steps },
    };
  }

  steps.push({ id: 'mcp.thread.read', kind: 'retrieval', lane: 'n/a', detail: 'ok' });

  const threadPayload = typeof cp.data === 'string' ? cp.data : JSON.stringify(cp.data, null, 2);
  /** Context bounding (SPEC-010 §5.2): only MCP thread payload — no repo or mailbox-wide retrieval. */
  const userContent = truncateForPrompt(
    `${THREAD_SUMMARY_JSON_INSTRUCTION}\n\n--- Thread content ---\n${threadPayload}\n---`,
    120_000,
  );
  recordThreadSummarizeBoundedContext({
    threadPayloadChars: threadPayload.length,
    boundedPromptChars: userContent.length,
  });

  const localReady = readiness.status === 'running_ready' && readiness.localLlmEnabled;

  if (localReady) {
    const model = pickOllamaModelForSummarize(readiness);
    if (!model) {
      steps.push({
        id: 'interpret.summarize',
        kind: 'interpretation',
        lane: 'local',
        detail: 'no_model_tag',
      });
      return {
        ok: false,
        code: 'no_model_tag',
        message: 'Local LLM is ready but no model tag could be selected.',
        trace: { readiness, steps },
      };
    }
    try {
      const { content } = await postLocalModelChat({
        model,
        messages: [{ role: 'user', content: userContent }],
      });
      const rawLlmResponse = content.trim();
      const parsed = parseThreadSummaryV1FromLlm(rawLlmResponse);
      if (parsed.ok === false) {
        steps.push({
          id: 'interpret.summarize',
          kind: 'interpretation',
          lane: 'local',
          model,
          fallbackUsed: false,
          fallbackReason: 'none',
          detail: `interpretation_invalid: ${parsed.reason}`,
        });
        return {
          ok: false,
          code: 'interpretation_invalid',
          message: `Interpretation did not return valid ThreadSummaryV1 JSON (${parsed.reason}).`,
          trace: { readiness, steps, rawLlmResponse },
        };
      }
      steps.push({
        id: 'interpret.summarize',
        kind: 'interpretation',
        lane: 'local',
        model,
        fallbackUsed: false,
        fallbackReason: 'none',
        detail: 'thread_summary_v1',
      });
      const trace: ThreadSummarizeTrace = {
        readiness,
        steps,
        summarySchema: THREAD_SUMMARY_SCHEMA_ID,
        rawLlmResponse,
        threadSummaryV1: parsed.value,
      };
      return {
        ok: true,
        summary: parsed.value,
        summarySchema: THREAD_SUMMARY_SCHEMA_ID,
        rawLlmResponse,
        trace,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({
        id: 'interpret.summarize',
        kind: 'interpretation',
        lane: 'local',
        detail: msg,
      });
      return {
        ok: false,
        code: 'local_error',
        message: msg,
        trace: { readiness, steps },
      };
    }
  }

  const pol = readiness.fallbackPolicy;
  if (pol === 'disabled') {
    steps.push({
      id: 'interpret.summarize',
      kind: 'interpretation',
      lane: 'n/a',
      detail: 'blocked: LOCAL_LLM_FALLBACK=disabled',
    });
    return {
      ok: false,
      code: 'blocked',
      message:
        'Local model is not ready and fallback is disabled (LOCAL_LLM_FALLBACK=disabled). Start Ollama and pull required models, or change policy.',
      trace: { readiness, steps },
    };
  }

  if (pol === 'proposal' && !opts.cloudConfirmed) {
    steps.push({
      id: 'interpret.summarize',
      kind: 'interpretation',
      lane: 'n/a',
      detail: 'awaiting user proposal for cloud summarization',
    });
    return {
      ok: false,
      code: 'needs_proposal',
      message:
        'Local model is not ready. Confirm whether to use cloud summarization when it is available, or fix local readiness first.',
      trace: { readiness, steps },
    };
  }

  const fb: InterpretationLaneTrace['fallbackReason'] =
    pol === 'proposal' && opts.cloudConfirmed ? 'user_selected' : 'policy_allowed_fallback';

  steps.push({
    id: 'interpret.summarize',
    kind: 'interpretation',
    lane: 'remote',
    model: 'gemini',
    fallbackUsed: true,
    fallbackReason: fb,
    detail: 'Cloud summarization not wired in this build',
  });
  return {
    ok: false,
    code: 'remote_unavailable',
    message:
      'Remote summarization is not connected in this build. When local lane is unavailable, enable Ollama or wait for a cloud connector.',
    trace: { readiness, steps },
  };
}
