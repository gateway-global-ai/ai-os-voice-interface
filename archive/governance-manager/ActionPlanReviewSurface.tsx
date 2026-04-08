/**
 * Review synthesized action plan, set proposed → approved, save, execute approved steps.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ChevronLeft, Loader2, Play, Save, Circle, XCircle, AlertCircle } from 'lucide-react';
import type { GovernanceDataPhase } from './src-governance-snapshot/GovernanceCanvasContext';
import type {
  ActionPlanAction,
  ActionPlanDocument,
  ActionPlanBundle,
} from './src-governance-snapshot/canvasBridge';
import {
  putActionPlan,
  executeActionPlan,
} from './src-governance-snapshot/canvasBridge';
import { useDiagnosticsChromeEnabled } from '../shell/DiagnosticsChromeContext';

type Props = {
  sourceName: string;
  bundle: ActionPlanBundle | null;
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onBack: () => void;
  onRefresh: () => void;
};

function cycleStatus(current: string, direction: 'approve' | 'unapprove' | 'reject'): string {
  if (direction === 'approve') {
    if (current === 'proposed') return 'approved';
    if (current === 'rejected') return 'proposed';
    return current;
  }
  if (direction === 'unapprove') {
    if (current === 'approved') return 'proposed';
    return current;
  }
  if (direction === 'reject') {
    if (current === 'proposed' || current === 'approved') return 'rejected';
    return current;
  }
  return current;
}

export function ActionPlanReviewSurface({
  sourceName,
  bundle,
  dataPhase,
  dataError,
  onBack,
  onRefresh,
}: Props) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const [plan, setPlan] = useState<ActionPlanDocument | null>(bundle?.plan ?? null);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);

  useEffect(() => {
    if (bundle?.plan) setPlan(bundle.plan);
  }, [bundle]);

  const actions = plan?.actions ?? [];
  const mergeNotes = plan?.merge_notes ?? [];

  const updateAction = useCallback((id: string, patch: Partial<ActionPlanAction>) => {
    setPlan((p) => {
      if (!p) return p;
      return {
        ...p,
        actions: p.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!plan) return;
    setSaving(true);
    setBusyMsg(null);
    try {
      await putActionPlan(sourceName, plan);
      setBusyMsg('Saved.');
      onRefresh();
    } catch (e) {
      setBusyMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [plan, sourceName, onRefresh]);

  const handleExecute = useCallback(async () => {
    setExecuting(true);
    setBusyMsg(null);
    try {
      const out = await executeActionPlan(sourceName, false);
      setBusyMsg(`Execution finished: ${JSON.stringify(out)}`);
      onRefresh();
    } catch (e) {
      setBusyMsg(e instanceof Error ? e.message : 'Execute failed');
    } finally {
      setExecuting(false);
    }
  }, [sourceName, onRefresh]);

  const loading = dataPhase === 'loading';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-4xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-zinc-100 shrink-0 flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-emerald-600 mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Action plan</p>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Review & approve</h2>
          <p
            className={`text-zinc-500 text-sm mt-1 ${showDiagnosticsChrome ? 'font-mono' : ''}`}
          >
            {sourceName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !plan}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          <button
            type="button"
            onClick={() => void handleExecute()}
            disabled={executing || !plan}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold disabled:opacity-50"
          >
            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Execute approved
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          </div>
        )}
        {dataError && !loading && (
          <div className="flex items-start gap-2 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-900 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Could not load action plan</p>
              <p className="mt-1 opacity-90">{dataError}</p>
              <p className="mt-2 text-xs">
                {showDiagnosticsChrome ? (
                  <>
                    Run:{' '}
                    <code className="bg-amber-100/80 px-1 rounded">
                      py scripts/synthesize_action_plan.py {sourceName}
                    </code>{' '}
                    in governing_docs, then refresh the Governance API.
                  </>
                ) : (
                  'Generate the action plan in your governing-docs repo, then refresh the Governance API.'
                )}
              </p>
            </div>
          </div>
        )}
        {busyMsg && (
          <div
            className={`text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-xl p-3 ${
              showDiagnosticsChrome ? 'font-mono' : ''
            }`}
          >
            {busyMsg}
          </div>
        )}

        {!loading && plan && mergeNotes.length > 0 && (
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">Merge notes</p>
            <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
              {mergeNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        {!loading && plan && actions.length === 0 && !dataError && (
          <p className="text-sm text-zinc-500">No actions in plan.</p>
        )}

        {!loading &&
          actions.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-zinc-100 bg-white shadow-sm p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  {showDiagnosticsChrome ? (
                    <p className="text-xs font-mono text-zinc-400">{a.id}</p>
                  ) : null}
                  <h3 className="text-lg font-bold text-zinc-900">{a.title}</h3>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    a.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : a.status === 'proposed'
                        ? 'bg-zinc-100 text-zinc-700'
                        : a.status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : a.status === 'completed'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  {a.status}
                </span>
              </div>
              {a.description && <p className="text-sm text-zinc-600 leading-relaxed">{a.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                {a.document_id ? <span>Doc: {a.document_id}</span> : null}
                {a.target_path ? <span>Path: {a.target_path}</span> : null}
                {a.priority ? <span>Priority: {a.priority}</span> : null}
                {a.execution_kind ? <span>Kind: {a.execution_kind}</span> : null}
              </div>
              {(a.execution_note || a.execution_error) && (
                <p
                  className={`text-xs text-zinc-600 bg-zinc-50 rounded-lg p-2 ${
                    showDiagnosticsChrome ? 'font-mono' : ''
                  }`}
                >
                  {a.execution_error || a.execution_note}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-50">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100"
                  onClick={() => updateAction(a.id, { status: cycleStatus(a.status, 'approve') })}
                  disabled={a.status === 'completed' || a.status === 'failed'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-50 text-zinc-700 text-xs font-bold hover:bg-zinc-100"
                  onClick={() => updateAction(a.id, { status: cycleStatus(a.status, 'unapprove') })}
                  disabled={a.status === 'completed' || a.status === 'failed'}
                >
                  <Circle className="w-3.5 h-3.5" />
                  Proposed
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-800 text-xs font-bold hover:bg-red-100"
                  onClick={() => updateAction(a.id, { status: cycleStatus(a.status, 'reject') })}
                  disabled={a.status === 'completed' || a.status === 'failed'}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}

        {bundle && bundle.execution_log && bundle.execution_log.length > 0 && (
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">
              Execution log (tail)
            </p>
            {showDiagnosticsChrome ? (
              <pre className="text-[10px] font-mono text-zinc-600 overflow-x-auto max-h-48 overflow-y-auto">
                {bundle.execution_log
                  .slice(-30)
                  .map((e) => JSON.stringify(e))
                  .join('\n')}
              </pre>
            ) : (
              <p className="text-xs text-zinc-600">
                {bundle.execution_log.length} execution event
                {bundle.execution_log.length === 1 ? '' : 's'} — enable diagnostics mode to view full JSON lines.
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
