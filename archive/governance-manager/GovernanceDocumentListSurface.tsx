/**
 * Governance canvas surface: document list (intent output — not a persistent dashboard).
 * Registry data and full-text search are owned by GovernanceCanvasProvider.
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Search, ShieldAlert, ClipboardCheck, GitBranch, Loader2 } from 'lucide-react';
import type { CanvasView } from './src-governance-snapshot/canvasTypes';
import type { DocumentListItem } from './src-governance-snapshot/canvasBridge';
import {
  useGovernanceCanvas,
  type GovernanceDataPhase,
} from './src-governance-snapshot/GovernanceCanvasContext';
import { useDiagnosticsChromeEnabled } from '../shell/DiagnosticsChromeContext';

type Props = {
  documents: DocumentListItem[];
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onRetry: () => void;
  onClose: () => void;
  onNavigate: (view: CanvasView, meta?: { documentId?: string }) => void;
};

function statusStyle(status: string): string {
  if (status === 'ratified') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'draft') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (status === 'unregistered') return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  return 'bg-sky-100 text-sky-800 border-sky-200';
}

export function GovernanceDocumentListSurface({
  documents,
  dataPhase,
  dataError,
  onRetry,
  onClose,
  onNavigate,
}: Props) {
  const {
    searchProjection,
    searchPhase,
    searchError,
    runSearch,
    clearSearch,
    documentListToolbarMode,
  } = useGovernanceCanvas();
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const reviewChrome = documentListToolbarMode === 'review';

  const [filterInput, setFilterInput] = useState('');

  const loading = dataPhase === 'loading';
  const error = dataError;
  const searching = searchPhase === 'loading';

  const displayDocuments = searchProjection ?? documents;

  const filtered = useMemo(() => {
    const q = filterInput.trim().toLowerCase();
    if (!q) return displayDocuments;
    return displayDocuments.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.document_id && d.document_id.toLowerCase().includes(q)) ||
        d.category.toLowerCase().includes(q)
    );
  }, [displayDocuments, filterInput]);

  const submitServerSearch = () => {
    void runSearch(filterInput.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-5xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-zinc-100 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <FileText className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">
              {reviewChrome ? 'Review · Document registry' : 'Governance · Documents'}
            </h2>
            <p className="text-zinc-500 text-sm">
              {reviewChrome
                ? 'Search and open documents — review mode (focused toolbar).'
                : 'Surface: document list (opens only when you ask or choose it)'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="search"
                value={filterInput}
                onChange={(e) => setFilterInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitServerSearch()}
                placeholder="Filter or search full corpus..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <button
              type="button"
              onClick={submitServerSearch}
              disabled={searching || !filterInput.trim() || loading}
              className="px-4 py-3 rounded-xl bg-zinc-900 text-white text-sm font-bold disabled:opacity-40"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>
          {!reviewChrome && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('conflict_results')}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold hover:bg-zinc-200 disabled:opacity-40"
              >
                <ShieldAlert className="w-4 h-4" />
                Conflicts
              </button>
              <button
                type="button"
                onClick={() => onNavigate('compliance_check')}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold hover:bg-zinc-200 disabled:opacity-40"
              >
                <ClipboardCheck className="w-4 h-4" />
                Compliance
              </button>
              <button
                type="button"
                onClick={() => onNavigate('lifecycle_status')}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold hover:bg-zinc-200 disabled:opacity-40"
              >
                <GitBranch className="w-4 h-4" />
                Lifecycle
              </button>
            </div>
          )}
        </div>
        {(error || searchError) && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {searchError && (
              <>
                <p className="text-sm text-amber-700">{searchError}</p>
                <button
                  type="button"
                  onClick={() => clearSearch()}
                  className="text-sm font-bold text-zinc-600 hover:underline"
                >
                  Clear search
                </button>
              </>
            )}
            {error && dataPhase === 'error' && (
              <button
                type="button"
                onClick={onRetry}
                className="text-sm font-bold text-emerald-600 hover:underline"
              >
                Retry load
              </button>
            )}
          </div>
        )}
        {searchProjection !== null && searchPhase === 'success' && (
          <div className="mt-3 flex items-center gap-3 text-sm text-zinc-600">
            <span>Search projection: matches first, then the rest of the registry.</span>
            <button
              type="button"
              onClick={() => clearSearch()}
              className="font-bold text-emerald-600 hover:underline"
            >
              Clear search results
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-8 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-xs text-zinc-400">Loading registry…</p>
          </div>
        ) : dataPhase === 'error' ? (
          <div className="text-center py-16 px-4">
            <p className="text-zinc-800 font-medium">Could not load documents.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
            >
              Retry
            </button>
          </div>
        ) : dataPhase === 'empty' ? (
          <div className="text-center py-16 px-4 max-w-md mx-auto">
            <p className="text-zinc-800 font-medium">No documents to show.</p>
            <p className="text-sm text-zinc-500 mt-2">
              {showDiagnosticsChrome ? (
                <>
                  Start the governance API and regenerate{' '}
                  <code className="text-xs bg-zinc-100 px-1 rounded">DOCUMENT_REGISTRY.json</code>, or try a
                  conflict scan to verify the corpus.
                </>
              ) : (
                'Start the governance API and refresh the document registry, or run a conflict scan to verify the corpus.'
              )}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('conflict_results')}
              className="mt-6 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
            >
              Run conflict scan
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-zinc-500">
            No documents match your filter. Clear the search box or try different keywords.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((d) => (
              <button
                key={d.path || d.title}
                type="button"
                disabled={!d.document_id}
                onClick={() => d.document_id && onNavigate('document_view', { documentId: d.document_id })}
                className="text-left p-4 rounded-2xl border border-zinc-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusStyle(d.status)}`}
                >
                  {d.status || 'unknown'}
                </span>
                <h3 className="mt-2 font-bold text-zinc-900 text-sm leading-snug line-clamp-2">
                  {d.title}
                </h3>
                <p
                  className={`mt-1 text-xs text-zinc-500 truncate ${showDiagnosticsChrome ? 'font-mono' : ''}`}
                >
                  {showDiagnosticsChrome
                    ? `${d.document_id || '—'} · v${d.version || '?'}`
                    : `Version ${d.version || '?'}`}
                </p>
                <p className="text-[10px] text-zinc-400 mt-1">{d.category}</p>
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
          Close surface
        </button>
      </div>
    </motion.div>
  );
}
