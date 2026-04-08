/**
 * Selected-message actions: thread read + draft reply via ExecutionPlan → evaluateExecutionPlan → control plane.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { WorkspaceMailRead } from '../shellCanvas/loadWorkspacePayload';
import { runWorkspaceControlPlane } from '../workspace/integrationControlPlane';
import {
  buildDraftReplyPlan,
  buildSummarizeThreadPlan,
  buildThreadReadPlan,
  runMessageActionPolicy,
} from '../workspace/messageActionPlans';
import { runThreadSummarizeGoverned, type ThreadSummaryV1 } from '../workspace/threadSummarize';
import {
  extractGmailMessageIdFromPayload,
  extractGmailThreadIdFromPayload,
} from '../workspace/workspaceMcpDisplay';
import { useDiagnosticsChromeEnabled } from '../shell/DiagnosticsChromeContext';

function ThreadSummaryV1View({ summary }: { summary: ThreadSummaryV1 }) {
  const list = (title: string, items: string[]) =>
    items.length > 0 ? (
      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-zinc-800">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="rounded-xl border border-sky-100 bg-white p-3 space-y-3 text-sm text-zinc-800 shadow-sm">
      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Summary</h4>
        <p className="mt-1 leading-relaxed whitespace-pre-wrap">{summary.summary.trim() || '—'}</p>
      </section>
      {summary.requestedAction ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Requested action</h4>
          <p className="mt-1">{summary.requestedAction}</p>
        </section>
      ) : null}
      {list('Open questions', summary.openQuestions)}
      {list('Dates / commitments', summary.datesCommitments)}
      {summary.suggestedNextStep ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Suggested next step</h4>
          <p className="mt-1">{summary.suggestedNextStep}</p>
        </section>
      ) : null}
    </div>
  );
}

function ActionResultPreview({ data }: { data: unknown }) {
  const text =
    typeof data === 'string'
      ? data
      : (() => {
          try {
            return JSON.stringify(data, null, 2);
          } catch {
            return String(data);
          }
        })();
  return (
    <pre className="text-xs bg-white border border-zinc-100 rounded-xl p-3 overflow-x-auto max-h-72 shadow-sm text-zinc-800 whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
}

/** Raw MCP payload only when diagnostics chrome is on; otherwise a short primary-safe status line. */
function MailActionResultPreview({
  data,
  showDiagnosticsChrome,
  primaryStatus,
}: {
  data: unknown;
  showDiagnosticsChrome: boolean;
  primaryStatus: string;
}) {
  if (showDiagnosticsChrome) {
    return <ActionResultPreview data={data} />;
  }
  return (
    <p
      className="text-xs text-zinc-700 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2"
      role="status"
    >
      {primaryStatus}
    </p>
  );
}

const BASE_ENVELOPE = {
  actor_type: 'founder' as const,
  tenant_id: 'local',
  user_binding: 'browser',
  execution_mode: 'execute' as const,
};

export function MailMessageActionsPanel({
  mailRead,
  openMailMessageId,
}: {
  mailRead: WorkspaceMailRead;
  openMailMessageId?: string;
}) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const [threadData, setThreadData] = useState<unknown | null>(null);
  const [draftData, setDraftData] = useState<unknown | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'thread' | 'draft' | 'summarize' | null>(null);
  const [summarizeStructured, setSummarizeStructured] = useState<ThreadSummaryV1 | null>(null);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [summarizeTrace, setSummarizeTrace] = useState<unknown | null>(null);
  const [cloudSummarizeConfirmed, setCloudSummarizeConfirmed] = useState(false);
  const [draftBody, setDraftBody] = useState('');
  const [draftConfirmed, setDraftConfirmed] = useState(false);

  const messageId = useMemo(() => {
    if (openMailMessageId?.trim()) return openMailMessageId.trim();
    if (mailRead.data) return extractGmailMessageIdFromPayload(mailRead.data);
    return undefined;
  }, [openMailMessageId, mailRead.data]);

  const threadId = useMemo(() => {
    if (mailRead.data) return extractGmailThreadIdFromPayload(mailRead.data);
    return undefined;
  }, [mailRead.data]);

  const runThreadRead = useCallback(async () => {
    if (!threadId) {
      setThreadError('No Gmail thread id in the message payload — open a message that includes thread metadata.');
      return;
    }
    setThreadError(null);
    setThreadData(null);
    const plan = buildThreadReadPlan(threadId);
    const pol = runMessageActionPolicy(plan);
    if (pol.decision === 'block') {
      setThreadError(pol.userMessages[0] ?? 'Policy blocked this action.');
      return;
    }
    if (pol.decision === 'require_proposal') {
      setThreadError(
        pol.userMessages[0] ?? 'Policy requires confirmation for this thread read — not expected for read-only.',
      );
      return;
    }
    setLoading('thread');
    try {
      const result = await runWorkspaceControlPlane(
        {
          ...BASE_ENVELOPE,
          intent: 'workspace.mail.thread.read',
          policy_context: { scope_class: 'workspace.google.read' },
          resource_ref: { type: 'thread', id: threadId },
          execution_scope: plan.executionScope,
        },
        { surfaceMode: 'founder' },
      );
      if (result.ok === false) {
        setThreadError(result.message);
        return;
      }
      setThreadData(result.data);
    } finally {
      setLoading(null);
    }
  }, [threadId]);

  const runSummarize = useCallback(async () => {
    if (!threadId) {
      setSummarizeError('No Gmail thread id — cannot summarize.');
      return;
    }
    setSummarizeError(null);
    setSummarizeStructured(null);
    setSummarizeTrace(null);
    const plan = buildSummarizeThreadPlan(threadId);
    const pol = runMessageActionPolicy(plan);
    if (pol.decision === 'block') {
      setSummarizeError(pol.userMessages[0] ?? 'Policy blocked summarization.');
      return;
    }
    if (pol.decision === 'require_proposal') {
      setSummarizeError(
        pol.userMessages[0] ?? 'Policy unexpectedly requires proposal for read-plane summarize.',
      );
      return;
    }
    setLoading('summarize');
    try {
      const result = await runThreadSummarizeGoverned({
        threadId,
        executionScope: plan.executionScope,
        cloudConfirmed: cloudSummarizeConfirmed,
      });
      setSummarizeTrace(result.trace);
      if (result.ok === false) {
        setSummarizeError(result.message);
        setSummarizeStructured(null);
      } else {
        setSummarizeStructured(result.summary);
        setSummarizeError(null);
      }
    } finally {
      setLoading(null);
    }
  }, [threadId, cloudSummarizeConfirmed]);

  const runDraftReply = useCallback(async () => {
    if (!draftConfirmed) return;
    if (!messageId) {
      setDraftError('No message id — reload the message from search or paste id.');
      return;
    }
    setDraftError(null);
    setDraftData(null);
    const plan = buildDraftReplyPlan(messageId, threadId);
    const pol = runMessageActionPolicy(plan);
    if (pol.decision === 'block') {
      setDraftError(pol.userMessages[0] ?? 'Policy blocked this action.');
      return;
    }
    setLoading('draft');
    try {
      const result = await runWorkspaceControlPlane(
        {
          ...BASE_ENVELOPE,
          intent: 'workspace.mail.draft_reply',
          policy_context: { scope_class: 'workspace.google.write' },
          resource_ref: {
            type: 'message',
            id: messageId,
            ...(threadId ? { threadId } : {}),
          },
          query: draftBody.trim() || ' ',
          execution_scope: plan.executionScope,
        },
        { surfaceMode: 'founder' },
      );
      if (result.ok === false) {
        setDraftError(result.message);
        return;
      }
      setDraftData(result.data);
      setDraftConfirmed(false);
    } finally {
      setLoading(null);
    }
  }, [messageId, threadId, draftBody, draftConfirmed]);

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-4 space-y-4 text-sm text-zinc-800">
      <div>
        <p className="font-semibold text-zinc-900">Governed message actions</p>
        {showDiagnosticsChrome ? (
          <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
            Plans are compiled and evaluated with the same policy model as mail search. Thread load uses the extended MCP
            tool <span className="font-mono text-[11px]">get_gmail_thread_content</span>; drafts use{' '}
            <span className="font-mono text-[11px]">draft_gmail_message</span> — align args with your server if calls fail.
          </p>
        ) : (
          <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
            The same safety checks apply as for mail search. Load the full thread to read everything, then draft a reply
            after you review.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-700">Thread (read plane)</p>
        <button
          type="button"
          disabled={loading !== null || !threadId}
          onClick={() => void runThreadRead()}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {loading === 'thread' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Load full thread
        </button>
        {!threadId ? (
          <p className="text-xs text-amber-900">Thread id not found on this payload — cannot load thread.</p>
        ) : null}
        {threadError ? (
          <p className="text-xs text-red-800" role="alert">
            {threadError}
          </p>
        ) : null}
        {threadData != null ? (
          <MailActionResultPreview
            data={threadData}
            showDiagnosticsChrome={showDiagnosticsChrome}
            primaryStatus="Thread loaded."
          />
        ) : null}
      </div>

      <div className="space-y-2 border-t border-amber-200/60 pt-3">
        <p className="text-xs font-medium text-zinc-700">Summarize thread (read / local interpretation)</p>
        {showDiagnosticsChrome ? (
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Intent <span className="font-mono">workspace.mail.thread.summarize</span> — MCP retrieval +{' '}
            <span className="font-mono">local.llm.summarize</span> (ThreadSummaryV1 JSON) when Ollama is{' '}
            <span className="font-mono">running_ready</span>. Invalid JSON →{' '}
            <span className="font-mono">interpretation_invalid</span>. Fallback:{' '}
            <span className="font-mono">LOCAL_LLM_FALLBACK</span>.
          </p>
        ) : (
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Summarization prefers your on-device interpreter when it is available; otherwise it may use the cloud if you
            consent below.
          </p>
        )}
        <label className="flex items-start gap-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            checked={cloudSummarizeConfirmed}
            onChange={(e) => setCloudSummarizeConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-zinc-300"
          />
          <span>
            If local is unavailable, I consent to cloud summarization when the connector is available (policy{' '}
            {showDiagnosticsChrome ? <span className="font-mono">proposal</span> : '"proposal"'}).
          </span>
        </label>
        <button
          type="button"
          disabled={loading !== null || !threadId}
          onClick={() => void runSummarize()}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
        >
          {loading === 'summarize' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Summarize thread
        </button>
        {!threadId ? (
          <p className="text-xs text-amber-900">Thread id not found — cannot summarize.</p>
        ) : null}
        {summarizeError ? (
          <p className="text-xs text-red-800" role="alert">
            {summarizeError}
          </p>
        ) : null}
        {summarizeStructured != null ? <ThreadSummaryV1View summary={summarizeStructured} /> : null}
        {summarizeTrace != null && showDiagnosticsChrome ? (
          <details className="rounded-xl border border-zinc-200 bg-zinc-50/80 text-xs text-zinc-600">
            <summary className="cursor-pointer font-medium text-zinc-700 select-none px-3 py-2">
              Operator: readiness, lane trace, raw model output
            </summary>
            <pre className="px-3 pb-3 overflow-x-auto max-h-64 text-zinc-800 border-t border-zinc-100 bg-white">
              {JSON.stringify(summarizeTrace, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-amber-200/60 pt-3">
        <p className="text-xs font-medium text-zinc-700">Draft reply (draft plane)</p>
        <textarea
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
          placeholder="Draft body (plain text)"
          rows={4}
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
        />
        <label className="flex items-start gap-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            checked={draftConfirmed}
            onChange={(e) => setDraftConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-zinc-300"
          />
          <span>I confirm creating a Gmail draft (policy may require this step).</span>
        </label>
        <button
          type="button"
          disabled={loading !== null || !messageId || !draftConfirmed}
          onClick={() => void runDraftReply()}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {loading === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create draft
        </button>
        {!messageId ? (
          <p className="text-xs text-amber-900">Message id missing — cannot draft reply.</p>
        ) : null}
        {draftError ? (
          <p className="text-xs text-red-800" role="alert">
            {draftError}
          </p>
        ) : null}
        {draftData != null ? (
          <MailActionResultPreview
            data={draftData}
            showDiagnosticsChrome={showDiagnosticsChrome}
            primaryStatus="Draft saved to Gmail."
          />
        ) : null}
      </div>
    </div>
  );
}
