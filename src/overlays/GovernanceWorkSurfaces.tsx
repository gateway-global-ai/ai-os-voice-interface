/**
 * Founder intent hub and focused work modes — not a combined document dashboard.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  ClipboardList,
  FlaskConical,
  LayoutGrid,
  MessageCircle,
  Search,
  FileText,
  User,
  ChevronRight,
  Loader2,
  PlusCircle,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import type { CanvasView } from '../governance/canvasTypes';
import type { DocumentListItem } from '../governance/canvasBridge';
import type { PlanningDocumentItem } from '../governance/governanceIntroductionOrder';
import type { GovernanceDataPhase } from '../governance/GovernanceCanvasContext';

type HubProps = {
  actorLabel: string;
  dataPhase: GovernanceDataPhase;
  onClose: () => void;
  onSelectMode: (view: CanvasView) => void;
};

export function GovernanceHubSurface({ actorLabel, dataPhase, onClose, onSelectMode }: HubProps) {
  const loading = dataPhase === 'loading';
  const modes: { view: CanvasView; title: string; blurb: string }[] = [
    {
      view: 'review_docs',
      title: 'Review Docs',
      blurb: 'Pinned README & Introduction, search, and review actions.',
    },
    {
      view: 'discuss_documents',
      title: 'Discuss Documents',
      blurb: 'Ask questions; use chat and document skills — sources only when needed.',
    },
    {
      view: 'planning_assistant',
      title: 'Planning Assistant',
      blurb: 'Next steps, progress, and sequential document status.',
    },
    {
      view: 'research_assistant',
      title: 'Research Assistant',
      blurb: 'Research library, reviews, recommendations, and tasks.',
    },
    {
      view: 'amendment_hub',
      title: 'Amendment Program',
      blurb: 'Workspace for runs and templates — create or resume; no automatic merge into the repo.',
    },
    {
      view: 'action_plan_review',
      title: 'Action plan',
      blurb: 'Merge impact reports → approve steps → execute whitelisted automation.',
    },
    {
      view: 'workspace_hub',
      title: 'Google Workspace',
      blurb: 'Governed read plane (Phase 1) — intents route through the control plane, not raw MCP.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-4xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-zinc-100 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <LayoutGrid className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Governance</p>
              <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">
                Intent for {actorLabel}
              </h2>
              <p className="text-zinc-500 text-sm mt-1 max-w-xl">
                Choose a work mode. Each surface shows only what you need for that job — not the full
                library and tools at once.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold">
            <User className="w-4 h-4" />
            <span>{actorLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-xs text-zinc-400">Preparing your workspace…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modes.map((m) => (
              <button
                key={m.view}
                type="button"
                onClick={() => onSelectMode(m.view)}
                className="text-left p-5 rounded-2xl border border-zinc-100 bg-zinc-50/80 hover:border-emerald-200 hover:bg-white hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-zinc-900">{m.title}</h3>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-600" />
                </div>
                <p className="text-sm text-zinc-500 mt-2 leading-snug">{m.blurb}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 flex justify-center shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-900 text-sm font-bold uppercase tracking-widest"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}

type ReviewProps = {
  pinned: DocumentListItem[];
  registryCount: number;
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onRetry: () => void;
  onBack: () => void;
  onOpenRegistry: () => void;
  onOpenDocument: (documentId: string) => void;
};

export function ReviewDocsSurface({
  pinned,
  registryCount,
  dataPhase,
  dataError,
  onRetry,
  onBack,
  onOpenRegistry,
  onOpenDocument,
}: ReviewProps) {
  const loading = dataPhase === 'loading';
  const err = dataError;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-3xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-zinc-100 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <BookOpen className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Review Docs</h2>
            <p className="text-zinc-500 text-sm">Pinned essentials and review actions</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          </div>
        ) : err ? (
          <div className="text-center py-8">
            <p className="text-red-600 text-sm">{err}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
                Pinned
              </h3>
              {pinned.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No README or Introduction found in the registry ({registryCount} documents). Open the
                  full list to locate them.
                </p>
              ) : (
                <ul className="space-y-2">
                  {pinned.map((d) => (
                    <li key={d.document_id}>
                      <button
                        type="button"
                        onClick={() => onOpenDocument(d.document_id)}
                        className="w-full text-left p-4 rounded-2xl border border-zinc-100 bg-zinc-50 hover:border-emerald-200 transition-colors"
                      >
                        <span className="font-bold text-zinc-900">{d.title}</span>
                        <p className="text-xs text-zinc-500 font-mono mt-1">{d.document_id}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
                Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenRegistry}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
                <button
                  type="button"
                  onClick={onOpenRegistry}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold"
                >
                  <FileText className="w-4 h-4" />
                  View document
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-zinc-200 text-zinc-400 text-xs font-bold cursor-not-allowed"
                >
                  Add comments
                  <span className="text-[10px] font-normal">(soon)</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-zinc-200 text-zinc-400 text-xs font-bold cursor-not-allowed"
                >
                  Request peer review
                  <span className="text-[10px] font-normal">(soon)</span>
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 flex justify-center shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-900 text-sm font-bold uppercase tracking-widest"
        >
          Back to modes
        </button>
      </div>
    </motion.div>
  );
}

type DiscussProps = {
  dataPhase: GovernanceDataPhase;
  onBack: () => void;
};

export function DiscussDocumentsSurface({ dataPhase, onBack }: DiscussProps) {
  const loading = dataPhase === 'loading';
  const [q, setQ] = useState('');
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-2xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 border-b border-zinc-100 shrink-0 flex items-center gap-3">
        <div className="p-3 bg-sky-500/10 rounded-2xl">
          <MessageCircle className="w-7 h-7 text-sky-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Discuss Documents</h2>
          <p className="text-zinc-500 text-sm">Ask in voice or chat — sources stay optional</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4">
        {loading ? (
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto block py-8" />
        ) : (
          <>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
              Your question
            </label>
            <textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              rows={4}
              placeholder="e.g. How does the introduction define actor roles?"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            <p className="text-xs text-zinc-500">
              Use the main chat or push-to-talk with governance intents. Document skills resolve answers;
              expand supporting sources only when you need citations.
            </p>
            <button
              type="button"
              onClick={() => setSourcesOpen((o) => !o)}
              className="text-xs font-bold text-sky-700 hover:underline"
            >
              {sourcesOpen ? 'Hide' : 'Show'} supporting sources (optional)
            </button>
            {sourcesOpen && (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600">
                No sources loaded — ask the agent to open a document when you want inline citations.
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 flex justify-center shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-900 text-sm font-bold uppercase tracking-widest"
        >
          Back to modes
        </button>
      </div>
    </motion.div>
  );
}

type PlanningProps = {
  documents: PlanningDocumentItem[];
  recommendedNextSteps: string[];
  progressSummary: string;
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onRetry: () => void;
  onBack: () => void;
  onOpenDocument: (documentId: string) => void;
  onOpenRegistry: () => void;
  onOpenLifecycle: () => void;
};

export function PlanningAssistantSurface({
  documents,
  recommendedNextSteps,
  progressSummary,
  dataPhase,
  dataError,
  onRetry,
  onBack,
  onOpenDocument,
  onOpenRegistry,
  onOpenLifecycle,
}: PlanningProps) {
  const loading = dataPhase === 'loading';
  const err = dataError;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-4xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-zinc-100 shrink-0 flex items-center gap-3">
        <div className="p-3 bg-amber-500/10 rounded-2xl">
          <ClipboardList className="w-7 h-7 text-amber-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Planning Assistant</h2>
          <p className="text-zinc-500 text-sm">{progressSummary}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
        {loading ? (
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto block py-12" />
        ) : err ? (
          <div className="text-center">
            <p className="text-red-600 text-sm">{err}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Recommended next steps
              </h3>
              <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
                {recommendedNextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Sequential document status
              </h3>
              <p className="text-[11px] text-zinc-500 mb-2">
                Numbers match <span className="font-mono">introduction.md</span> (“Complete Document
                Set”) — formal AIOS IDs only; not reference scratch files.
              </p>
              <ol className="m-0 list-none space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-0">
                {documents.map((d) => (
                  <li key={d.document_id} className="m-0 p-0">
                    <button
                      type="button"
                      onClick={() => onOpenDocument(d.document_id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50 text-left hover:border-amber-200"
                    >
                      <span
                        className="flex h-9 min-w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-base font-bold tabular-nums text-amber-950 px-1"
                        aria-hidden
                      >
                        {d.introductionNumber ?? '—'}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium text-zinc-900 truncate">
                        {d.title}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-zinc-500 shrink-0">
                        {d.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
                Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenRegistry}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold"
                >
                  Review (registry)
                </button>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-xl border border-dashed border-zinc-200 text-zinc-400 text-xs font-bold cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-xl border border-dashed border-zinc-200 text-zinc-400 text-xs font-bold cursor-not-allowed"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={onOpenLifecycle}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold"
                >
                  Archive / lifecycle
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 flex justify-center shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-900 text-sm font-bold uppercase tracking-widest"
        >
          Back to modes
        </button>
      </div>
    </motion.div>
  );
}

type ResearchProps = {
  library: DocumentListItem[];
  registryCount: number;
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onRetry: () => void;
  onBack: () => void;
  onOpenDocument: (documentId: string) => void;
  onOpenFullLibrary: () => void;
};

export function ResearchAssistantSurface({
  library,
  registryCount,
  dataPhase,
  dataError,
  onRetry,
  onBack,
  onOpenDocument,
  onOpenFullLibrary,
}: ResearchProps) {
  const loading = dataPhase === 'loading';
  const err = dataError;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-4xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-zinc-100 shrink-0 flex items-center gap-3">
        <div className="p-3 bg-violet-500/10 rounded-2xl">
          <FlaskConical className="w-7 h-7 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Research Assistant</h2>
          <p className="text-zinc-500 text-sm">
            {registryCount} documents in registry · research-tagged subset shown below
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
        {loading ? (
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto block py-12" />
        ) : err ? (
          <div className="text-center">
            <p className="text-red-600 text-sm">{err}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Research library
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {library.map((d) => (
                  <button
                    key={d.document_id}
                    type="button"
                    onClick={() => onOpenDocument(d.document_id)}
                    className="text-left p-3 rounded-xl border border-zinc-100 bg-zinc-50 hover:border-violet-200 text-sm text-zinc-900"
                  >
                    {d.title}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onOpenFullLibrary}
                className="mt-2 text-xs font-bold text-violet-700 hover:underline"
              >
                Open full document list
              </button>
            </section>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-100 p-4 bg-white">
                <h4 className="text-xs font-bold uppercase text-zinc-400 mb-2">Peer reviews</h4>
                <p className="text-sm text-zinc-500">No active reviews — connect workflow when API is ready.</p>
              </div>
              <div className="rounded-xl border border-zinc-100 p-4 bg-white">
                <h4 className="text-xs font-bold uppercase text-zinc-400 mb-2">Recommendations</h4>
                <p className="text-sm text-zinc-500">Suggestions will appear from scan + compliance signals.</p>
              </div>
            </section>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-100 p-4 bg-zinc-50/80">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400 mb-2">
                  <ListTodo className="w-4 h-4" />
                  Task list
                </h4>
                <p className="text-sm text-zinc-500">Track research tasks here (integration pending).</p>
              </div>
              <div className="rounded-xl border border-zinc-100 p-4 bg-zinc-50/80">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed actions
                </h4>
                <p className="text-sm text-zinc-500">Closed items will list here.</p>
              </div>
            </section>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-zinc-200 text-zinc-400 text-sm font-bold cursor-not-allowed"
            >
              <PlusCircle className="w-5 h-5" />
              Add research document
              <span className="text-xs font-normal">(soon)</span>
            </button>
          </>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 flex justify-center shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-900 text-sm font-bold uppercase tracking-widest"
        >
          Back to modes
        </button>
      </div>
    </motion.div>
  );
}
