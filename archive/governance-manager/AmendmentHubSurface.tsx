/**
 * Amendment Program workspace: list runs, resume/review, create from template — no auto-create on open.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ChevronLeft,
  FileText,
  HelpCircle,
  ListChecks,
  Loader2,
  PlayCircle,
  Eye,
  PlusCircle,
} from 'lucide-react';
import { createAmendmentWorkflowRun } from './_quarantine/documentsRestApiClient';
import type { GovernanceAmendmentHubPayload } from './src-governance-snapshot/loadGovernancePayload';
import type { GovernanceDataPhase } from './src-governance-snapshot/GovernanceCanvasContext';
import { useDiagnosticsChromeEnabled } from '../shell/DiagnosticsChromeContext';

type Props = {
  hub: GovernanceAmendmentHubPayload | null;
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onRetry: () => void;
  onBack: () => void;
  onOpenWorkflow: (runId: string, mode: 'edit' | 'review') => void;
};

export function AmendmentHubSurface({
  hub,
  dataPhase,
  dataError,
  onRetry,
  onBack,
  onOpenWorkflow,
}: Props) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const loading = dataPhase === 'loading';
  const err = dataError;
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string>('');

  const templates = hub?.templates ?? [];
  const inProgress = hub?.workspace.inProgress ?? [];
  const completed = hub?.workspace.completed ?? [];
  const unknownStatus = hub?.workspace.unknownStatus ?? [];
  const summary = hub?.summary;
  const runsLoad = hub?.runsLoad;
  const templatesLoad = hub?.templatesLoad;
  const runsFailed = runsLoad?.loadState === 'error';
  const templatesFailed = templatesLoad?.loadState === 'error';

  const handleCreate = async () => {
    const tid = templateId.trim() || templates[0]?.template_id;
    if (!tid) {
      setCreateError('No template available. Check the amendment-workflow API.');
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      const run = await createAmendmentWorkflowRun(tid);
      const rid = run.run_id?.trim();
      if (!rid) throw new Error('Create returned no run_id');
      onOpenWorkflow(rid, 'edit');
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="relative z-20 w-full max-w-4xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/95 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-5 md:p-6 border-b border-zinc-100 shrink-0 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-violet-500/10 rounded-2xl shrink-0">
            <ListChecks className="w-7 h-7 text-violet-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Amendment program</p>
            <h2 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">Workspace</h2>
            {summary && !runsFailed ? (
              <p className="text-zinc-500 text-sm mt-1">
                {summary.totalRuns} run{summary.totalRuns === 1 ? '' : 's'} · {summary.inProgressCount}{' '}
                active · {summary.completedCount} completed
                {summary.unknownCount > 0 ? ` · ${summary.unknownCount} unclassified` : ''}
              </p>
            ) : runsFailed ? (
              <p className="text-amber-800 text-sm mt-1 font-medium">
                Run list unavailable — see below. Templates may still load.
              </p>
            ) : (
              <p className="text-zinc-500 text-sm mt-1">Runs and templates from the API</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-900 text-xs font-bold uppercase tracking-widest shrink-0"
        >
          Back
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 space-y-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          </div>
        ) : err ? (
          <div className="text-center space-y-3">
            <p className="text-red-600 text-sm">{err}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-bold text-violet-700 underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {runsFailed ? (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-950"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Could not load amendment runs</p>
                  <p className="mt-1 opacity-90">{runsLoad?.errorMessage ?? 'Request failed.'}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 text-sm font-bold text-amber-900 underline"
                  >
                    Retry loading workspace
                  </button>
                </div>
              </div>
            ) : null}

            {templatesFailed ? (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-950"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Could not load templates</p>
                  <p className="mt-1 opacity-90">{templatesLoad?.errorMessage ?? 'Request failed.'}</p>
                  <p className="mt-1 text-xs opacity-80">
                    You can still resume or review runs if the list above loaded.
                  </p>
                </div>
              </div>
            ) : null}

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                In progress
              </h3>
              {runsFailed ? (
                <p className="text-sm text-zinc-500">
                  Unknown — runs failed to load (not the same as zero runs).
                </p>
              ) : inProgress.length === 0 ? (
                <p className="text-sm text-zinc-500">No active runs.</p>
              ) : (
                <ul className="space-y-2">
                  {inProgress.map((r) => (
                    <li
                      key={r.run_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 truncate">{r.title}</p>
                        <p
                          className={`text-xs text-zinc-500 mt-0.5 ${showDiagnosticsChrome ? 'font-mono' : ''}`}
                        >
                          {showDiagnosticsChrome ? `${r.run_id} · ${r.status}` : r.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenWorkflow(r.run_id, 'edit')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700"
                      >
                        Resume
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Completed
              </h3>
              {runsFailed ? (
                <p className="text-sm text-zinc-500">Unknown — runs failed to load.</p>
              ) : completed.length === 0 ? (
                <p className="text-sm text-zinc-500">No completed runs yet.</p>
              ) : (
                <ul className="space-y-2">
                  {completed.map((r) => (
                    <li
                      key={r.run_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-100 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 truncate">{r.title}</p>
                        <p
                          className={`text-xs text-zinc-500 mt-0.5 ${showDiagnosticsChrome ? 'font-mono' : ''}`}
                        >
                          {showDiagnosticsChrome ? r.run_id : 'Completed'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenWorkflow(r.run_id, 'review')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs font-bold hover:bg-zinc-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Unclassified status
              </h3>
              <p className="text-xs text-zinc-500 mb-3">
                The API returned a status we do not map to active or completed. Open with care — default
                is resume (edit).
              </p>
              {runsFailed ? (
                <p className="text-sm text-zinc-500">Unknown — runs failed to load.</p>
              ) : unknownStatus.length === 0 ? (
                <p className="text-sm text-zinc-500">None.</p>
              ) : (
                <ul className="space-y-2">
                  {unknownStatus.map((r) => (
                    <li
                      key={r.run_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 truncate">{r.title}</p>
                        <p
                          className={`text-xs text-zinc-600 mt-0.5 ${showDiagnosticsChrome ? 'font-mono' : ''}`}
                        >
                          {showDiagnosticsChrome ? (
                            <>
                              {r.run_id} · <span className="text-amber-800">{r.status}</span>
                            </>
                          ) : (
                            <span className="text-amber-800">{r.status}</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenWorkflow(r.run_id, 'edit')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 text-white text-xs font-bold hover:bg-zinc-900"
                      >
                        Resume
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 md:p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-violet-700 mb-3 flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                New addendum
              </h3>
              <p className="text-sm text-zinc-600 mb-4">
                Start a run from a template. Nothing is created until you confirm here.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <label className="flex-1 flex flex-col gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wide">
                  Template
                  <select
                    value={templateId || templates[0]?.template_id || ''}
                    onChange={(e) => setTemplateId(e.target.value)}
                    disabled={templates.length === 0}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900"
                  >
                    {templates.length === 0 ? (
                      <option value="">No templates</option>
                    ) : (
                      templates.map((t) => (
                        <option key={t.template_id} value={t.template_id}>
                          {t.title} ({t.amendment_id})
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={createBusy || templates.length === 0 || templatesFailed}
                  onClick={() => void handleCreate()}
                  className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-40"
                >
                  {createBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      Create run
                    </>
                  )}
                </button>
              </div>
              {createError ? (
                <p className="text-red-600 text-xs mt-2 font-medium">{createError}</p>
              ) : null}
            </section>
          </>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 shrink-0 bg-zinc-50/50">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 text-sm font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to modes
        </button>
      </div>
    </motion.div>
  );
}
