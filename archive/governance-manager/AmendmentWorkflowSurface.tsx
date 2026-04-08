/**
 * Amendment program: proposal → peer review → synthesized plan → step-by-step approval → console.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  Loader2,
  Terminal,
  Users,
  ListChecks,
  Info,
} from 'lucide-react';
import { marked } from 'marked';
import type { AmendmentWorkflowRunState } from './_quarantine/documentsRestApiClient';
import { advanceAmendmentWorkflowRun } from './_quarantine/documentsRestApiClient';
import type { GovernanceDataPhase } from './src-governance-snapshot/GovernanceCanvasContext';
import {
  readGovernanceDemoHints,
  writeGovernanceDemoHints,
} from './src-governance-snapshot/governanceDemoHints';
import { parseApprovalItemsFromPlan } from './amendmentPlanApproval';
import { useDiagnosticsChromeEnabled } from '../shell/DiagnosticsChromeContext';

type Props = {
  run: AmendmentWorkflowRunState | null;
  /** Read-only review of a completed (or frozen) run — no server advance. */
  workflowMode?: 'edit' | 'review';
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onBack: () => void;
  onRunUpdated: (run: AmendmentWorkflowRunState) => void;
};

type WorkflowScreen = 'proposal' | 'reviews' | 'plan' | 'approval' | 'console';

function renderMarkdown(md: string): string {
  const out = marked.parse(md, { async: false });
  return typeof out === 'string' ? out : '';
}

export function AmendmentWorkflowSurface({
  run,
  workflowMode = 'edit',
  dataPhase,
  dataError,
  onBack,
  onRunUpdated,
}: Props) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [screen, setScreen] = useState<WorkflowScreen>('proposal');
  const [approvalIndex, setApprovalIndex] = useState(0);
  const [demoHints, setDemoHints] = useState(readGovernanceDemoHints);

  const loading = dataPhase === 'loading';
  const err = dataError;
  const readOnly = workflowMode === 'review';

  const approvalItems = useMemo(
    () => parseApprovalItemsFromPlan(run?.consolidated_plan_markdown ?? ''),
    [run?.consolidated_plan_markdown]
  );

  const statusComplete =
    typeof run?.status === 'string' && run.status.toLowerCase() === 'completed';

  const hasReviews = (run?.peer_reviews?.length ?? 0) > 0;
  const hasPlan = !!(run?.consolidated_plan_markdown?.trim());

  /** In review mode, disable primary when the only action left is POST /advance. */
  const reviewBlocksAdvance =
    readOnly &&
    ((screen === 'reviews' && !hasPlan) ||
      (screen === 'plan' && approvalItems.length === 0 && hasPlan) ||
      (screen === 'console' && !statusComplete));

  useEffect(() => {
    setApprovalIndex(0);
  }, [run?.run_id, run?.consolidated_plan_markdown]);

  useEffect(() => {
    writeGovernanceDemoHints(demoHints);
  }, [demoHints]);

  const handleAdvance = async () => {
    if (readOnly) return;
    if (!run?.run_id) return;
    setAdvancing(true);
    setAdvanceError(null);
    try {
      const updated = await advanceAmendmentWorkflowRun(run.run_id);
      onRunUpdated(updated);
    } catch (e) {
      setAdvanceError(e instanceof Error ? e.message : 'Advance failed');
    } finally {
      setAdvancing(false);
    }
  };

  /** Overall progress 0–100 for the top bar. */
  const progressPct = useMemo(() => {
    if (!run) return 0;
    const order: WorkflowScreen[] = ['proposal', 'reviews', 'plan', 'approval', 'console'];
    const base = order.indexOf(screen);
    if (base < 0) return 0;
    if (screen === 'approval' && approvalItems.length > 0) {
      const approvalSpan = 45;
      const start = 35;
      return Math.min(
        99,
        start + ((approvalIndex + 1) / approvalItems.length) * approvalSpan
      );
    }
    const map: Record<WorkflowScreen, number> = {
      proposal: 12,
      reviews: 28,
      plan: 38,
      approval: 38,
      console: 100,
    };
    return map[screen] ?? 0;
  }, [run, screen, approvalIndex, approvalItems.length]);

  const goNextScreen = () => {
    if (!run) return;
    /** Always Proposal → Peer review next (never skip to Plan even if the API already sent plan markdown). */
    if (screen === 'proposal') {
      setScreen('reviews');
      return;
    }
    if (screen === 'reviews') {
      if (hasPlan) setScreen('plan');
      else void handleAdvance();
      return;
    }
    if (screen === 'plan') {
      if (approvalItems.length > 0) {
        setApprovalIndex(0);
        setScreen('approval');
      } else void handleAdvance();
      return;
    }
    if (screen === 'approval') {
      if (approvalIndex < approvalItems.length - 1) {
        setApprovalIndex((i) => i + 1);
      } else {
        setScreen('console');
      }
      return;
    }
    if (screen === 'console') {
      void handleAdvance();
    }
  };

  const goPrevScreen = () => {
    if (screen === 'approval') {
      if (approvalIndex > 0) {
        setApprovalIndex((i) => i - 1);
        return;
      }
      setScreen('plan');
      return;
    }
    if (screen === 'console') {
      if (approvalItems.length > 0) {
        setScreen('approval');
        setApprovalIndex(approvalItems.length - 1);
      } else setScreen('plan');
      return;
    }
    if (screen === 'plan') {
      if (hasReviews) setScreen('reviews');
      else setScreen('proposal');
      return;
    }
    if (screen === 'reviews') {
      setScreen('proposal');
      return;
    }
  };

  const primaryLabel = () => {
    if (!run) return 'Continue';
    /** Proposal only navigates to Peer review; server advance happens from Peer review when needed. */
    if (screen === 'proposal') return 'Continue';
    if (screen === 'reviews') return hasPlan ? 'Continue' : 'Advance step';
    if (screen === 'plan') {
      return approvalItems.length > 0 ? 'Start step-by-step approval' : 'Advance step';
    }
    if (screen === 'approval') {
      return approvalIndex < approvalItems.length - 1 ? 'Approve & next' : 'Finish review';
    }
    if (screen === 'console') return statusComplete ? 'Done' : 'Advance step';
    return 'Continue';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="relative z-20 w-full max-w-5xl mx-2 md:mx-4 max-h-[calc(100dvh-5rem)] min-h-0 flex flex-col rounded-3xl bg-white/95 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-4 md:p-6 border-b border-zinc-100 shrink-0 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-violet-500/10 rounded-2xl shrink-0">
            <ListChecks className="w-6 h-6 text-violet-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Amendment program</p>
            <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight truncate">
              {run?.meta?.title
                ? String(run.meta.title)
                : demoHints
                  ? 'Intent identity & state identity (demo)'
                  : 'Intent identity & state identity'}
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              {showDiagnosticsChrome ? (
                <>
                  Run <span className="font-mono">{run?.run_id ?? '…'}</span>
                </>
              ) : (
                <span>{run?.run_id ? 'Amendment run' : '…'}</span>
              )}
              {readOnly ? (
                <span className="ml-2 text-amber-700 font-bold uppercase tracking-wide text-[10px]">
                  Review mode
                </span>
              ) : null}
              {run?.meta?.amendment_id ? (
                showDiagnosticsChrome ? (
                  <span className="ml-2 font-mono">· {String(run.meta.amendment_id)}</span>
                ) : (
                  <span className="ml-2">· Amendment linked</span>
                )
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Demo hints
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
              checked={demoHints}
              onChange={(e) => setDemoHints(e.target.checked)}
              title="Show optional demo / triangulation explanations"
            />
          </label>
          {statusComplete && (
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Complete</span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 md:px-6 pt-3 pb-2 shrink-0 border-b border-zinc-100">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
          <span>Progress</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-violet-500"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2.5">
          {(
            [
              ['proposal', 'Proposal', FileText],
              ['reviews', 'Peer review', Users],
              ['plan', 'Plan', ListChecks],
              ['approval', 'Approvals', CheckCircle2],
              ['console', 'Console', Terminal],
            ] as const
          ).map(([id, label, Icon]) => {
            const active = screen === id;
            const done =
              (id === 'proposal' && screen !== 'proposal') ||
              (id === 'reviews' && ['plan', 'approval', 'console'].includes(screen)) ||
              (id === 'plan' && ['approval', 'console'].includes(screen)) ||
              (id === 'approval' && screen === 'console') ||
              (id === 'console' && statusComplete);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === 'proposal') setScreen('proposal');
                  if (id === 'reviews' && hasReviews) setScreen('reviews');
                  if (id === 'plan' && hasPlan) setScreen('plan');
                  if (id === 'approval' && approvalItems.length > 0) {
                    setScreen('approval');
                    setApprovalIndex(0);
                  }
                  if (id === 'console') setScreen('console');
                }}
                disabled={
                  (id === 'reviews' && !hasReviews) ||
                  (id === 'plan' && !hasPlan) ||
                  (id === 'approval' && approvalItems.length === 0) ||
                  (id === 'console' && !run)
                }
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  active
                    ? 'bg-violet-100 text-violet-800'
                    : done
                      ? 'text-emerald-600'
                      : 'text-zinc-400'
                } disabled:opacity-30 disabled:pointer-events-none`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          </div>
        ) : err ? (
          <p className="text-center text-red-600 text-sm p-6">{err}</p>
        ) : !run ? (
          <p className="text-zinc-500 text-sm p-6">No run loaded.</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${screen}-${approvalIndex}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 flex flex-col overflow-y-auto"
            >
              {screen === 'proposal' && (
                <div className="p-4 md:p-6 space-y-4 flex-1">
                  <p className="text-xs text-zinc-500">
                    {showDiagnosticsChrome ? (
                      <>
                        Template <span className="font-mono">{run.template_id}</span> —{' '}
                      </>
                    ) : (
                      <>From workflow template —{' '}</>
                    )}
                    {demoHints ? (
                      <>repository files are not modified by this demo.</>
                    ) : (
                      <>repository files are not merged automatically from this workflow.</>
                    )}
                  </p>
                  <article className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 md:p-6 max-h-[min(60vh,520px)] overflow-y-auto custom-scrollbar">
                    <div
                      className="markdown-plan text-sm text-zinc-800 leading-relaxed space-y-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_p]:text-zinc-700"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(run.proposal_markdown) }}
                    />
                  </article>
                </div>
              )}

              {screen === 'reviews' && (
                <div className="p-4 md:p-6 space-y-4 flex-1">
                  {demoHints ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 flex gap-3 text-sm text-amber-950">
                      <Info className="w-5 h-5 shrink-0 text-amber-600" />
                      <p>
                        <span className="font-semibold">Triangulation (demo).</span> Peer review blocks are
                        generated by the workflow service to simulate multiple perspectives before synthesis — not
                        live humans in this demo.
                      </p>
                    </div>
                  ) : null}
                  {run.peer_reviews.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      No peer reviews yet. Advance the workflow from the proposal step first.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {run.peer_reviews.map((r, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-zinc-100 bg-white p-4 text-sm text-zinc-800 shadow-sm"
                        >
                          <p className="font-bold text-zinc-900">{r.reviewer ?? 'Reviewer'}</p>
                          {r.dimensions && (
                            <p
                              className={`text-[11px] text-zinc-500 mt-1 ${
                                showDiagnosticsChrome ? 'font-mono' : ''
                              }`}
                            >
                              {Object.entries(r.dimensions)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' · ')}
                            </p>
                          )}
                          <p className="mt-2 leading-relaxed">{r.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {screen === 'plan' && (
                <div className="p-4 md:p-6 space-y-4 flex-1 flex flex-col min-h-0">
                  {demoHints ? (
                    <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 flex gap-3 text-sm text-violet-950">
                      <Info className="w-5 h-5 shrink-0 text-violet-600" />
                      <div>
                        <p className="font-semibold">Why you see headings like “Recommended plan (synthesized)”</p>
                        <p className="mt-1 text-violet-900/90">
                          That text is part of the <strong className="font-semibold">markdown</strong> returned by
                          the amendment workflow API
                          {showDiagnosticsChrome ? (
                            <>
                              {' '}
                              (<code className="text-xs bg-white/80 px-1 rounded">consolidated_plan_markdown</code>
                              )
                            </>
                          ) : (
                            ' (the synthesized plan field)'
                          )}
                          . It is not added by this UI — it comes from the template / synthesis on the server. Below
                          is the same content; the next step splits it into full-screen approval cards by section.
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {!run.consolidated_plan_markdown?.trim() ? (
                    <p className="text-sm text-zinc-500">
                      The synthesized plan appears after the workflow advances through peer review.
                    </p>
                  ) : (
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 max-h-[min(40vh,360px)] overflow-y-auto custom-scrollbar shrink-0">
                      <div
                        className="markdown-plan text-sm text-zinc-800 leading-relaxed space-y-2 [&_h1]:text-lg [&_h2]:text-base [&_h2]:font-semibold"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(run.consolidated_plan_markdown.slice(0, 4000)),
                        }}
                      />
                      {run.consolidated_plan_markdown.length > 4000 ? (
                        <p className="text-xs text-zinc-400 mt-2">… truncated in preview — full text on each approval card.</p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {screen === 'approval' && approvalItems.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
                  <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                      Approval {approvalIndex + 1} / {approvalItems.length}
                    </p>
                    <span
                      className={`text-xs text-zinc-500 truncate max-w-[40%] ${
                        showDiagnosticsChrome ? 'font-mono' : ''
                      }`}
                    >
                      {approvalItems[approvalIndex]?.title}
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 rounded-2xl border-2 border-violet-200/80 bg-gradient-to-b from-white to-violet-50/30 shadow-inner flex flex-col overflow-hidden">
                    <div className="p-4 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                      <h3 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight mb-4">
                        {approvalItems[approvalIndex].title}
                      </h3>
                      <div
                        className="markdown-plan text-base text-zinc-800 leading-relaxed space-y-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_p]:text-zinc-700 [&_strong]:text-zinc-900"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(approvalItems[approvalIndex].bodyMarkdown || '_No detail._'),
                        }}
                      />

                      <div className="mt-10 pt-8 border-t border-zinc-200/80">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">
                          Peer review context (footnotes)
                        </p>
                        {run.peer_reviews.length === 0 ? (
                          <p className="text-sm text-zinc-500">No peer reviews for this run.</p>
                        ) : (
                          <ul className="space-y-3">
                            {run.peer_reviews.map((r, i) => (
                              <li
                                key={i}
                                className="rounded-xl border border-zinc-200 bg-white/90 p-4 text-sm text-zinc-700 shadow-sm"
                              >
                                <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">
                                  {r.reviewer ?? `Reviewer ${i + 1}`}
                                </p>
                                <p className="mt-2 leading-relaxed">{r.summary}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {screen === 'console' && (
                <div className="p-4 md:p-6 flex-1 min-h-0">
                  <div
                    className={`rounded-2xl text-xs p-4 max-h-[min(60vh,480px)] overflow-y-auto space-y-2 ${
                      showDiagnosticsChrome
                        ? 'bg-zinc-950 text-zinc-100 font-mono'
                        : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                    }`}
                  >
                    {(run.console ?? []).map((line, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="shrink-0 text-zinc-500">
                          {line.ts?.slice(11, 19) ?? '—'}
                        </span>
                        <span
                          className={
                            line.level === 'ok'
                              ? showDiagnosticsChrome
                                ? 'text-emerald-400'
                                : 'text-emerald-700'
                              : line.level === 'warn'
                                ? showDiagnosticsChrome
                                  ? 'text-amber-400'
                                  : 'text-amber-700'
                                : showDiagnosticsChrome
                                  ? 'text-zinc-300'
                                  : 'text-zinc-600'
                          }
                        >
                          [{line.level}]
                        </span>
                        <span
                          className={`break-words ${
                            showDiagnosticsChrome ? 'text-zinc-200' : 'text-zinc-800'
                          }`}
                        >
                          {line.message}
                        </span>
                      </div>
                    ))}
                  </div>

                  <section className="mt-6 pt-4 border-t border-zinc-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Workflow steps</h3>
                    <ul className="space-y-2">
                      {run.steps.map((s) => (
                        <li key={s.id} className="flex items-start gap-3 text-sm text-zinc-700">
                          {s.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : s.status === 'active' ? (
                            <Circle className="w-5 h-5 text-violet-500 shrink-0 mt-0.5 stroke-2" />
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-300 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-semibold text-zinc-900">{s.label}</span>
                            <p className="text-xs text-zinc-500 mt-0.5">{s.detail}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 flex flex-col gap-2 shrink-0 bg-zinc-50/50">
        {advanceError ? (
          <p className="text-center text-red-600 text-xs font-medium">{advanceError}</p>
        ) : null}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-zinc-500 hover:text-zinc-900 text-sm font-bold uppercase tracking-widest order-2 sm:order-1"
          >
            Back to modes
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2 order-1 sm:order-2">
            {screen !== 'proposal' && (
              <button
                type="button"
                onClick={goPrevScreen}
                className="inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-bold hover:bg-zinc-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <button
              type="button"
              disabled={
                loading ||
                !!err ||
                !run ||
                reviewBlocksAdvance ||
                (screen === 'console' && statusComplete && !advancing) ||
                advancing
              }
              onClick={() => {
                if (screen === 'console' && !statusComplete) {
                  void handleAdvance();
                  return;
                }
                if (screen === 'plan' && approvalItems.length === 0 && hasPlan) {
                  void handleAdvance();
                  return;
                }
                goNextScreen();
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-40 disabled:pointer-events-none"
            >
              {advancing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Working…
                </>
              ) : (
                <>
                  {primaryLabel()}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}