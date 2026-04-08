/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Volume2, X } from 'lucide-react';
import { marked } from 'marked';
import type { DocumentDetail } from './src-governance-snapshot/canvasBridge';
import type { GovernanceDataPhase } from './src-governance-snapshot/GovernanceCanvasContext';
import { useDiagnosticsChromeEnabled } from '../shell/DiagnosticsChromeContext';

type Props = {
  documentId: string;
  doc: DocumentDetail | null;
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onRetry: () => void;
  onClose: () => void;
  onReadAloud: (plainText: string) => void;
};

function splitFrontMatter(raw: string): { meta: string; body: string } {
  if (!raw.startsWith('---')) return { meta: '', body: raw };
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return { meta: '', body: raw };
  return {
    meta: raw.slice(4, end),
    body: raw.slice(end + 5).trim(),
  };
}

export function DocumentViewerOverlay({
  documentId,
  doc,
  dataPhase,
  dataError,
  onRetry,
  onClose,
  onReadAloud,
}: Props) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const [tab, setTab] = useState<'body' | 'meta'>('body');

  const loading = dataPhase === 'loading';
  const error = dataError;
  const { meta, body } = doc ? splitFrontMatter(doc.content) : { meta: '', body: '' };
  let html = '';
  if (body) {
    const out = marked.parse(body, { async: false });
    html = typeof out === 'string' ? out : '';
  }

  const plainForSpeech = doc
    ? `${doc.title}. Version ${doc.version}. Status ${doc.status}. ${body.replace(/[#*`_[\]]/g, ' ').slice(0, 1200)}`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="relative z-20 w-full max-w-6xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/95 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-zinc-100 shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            {showDiagnosticsChrome ? doc?.document_id || documentId : 'Governance document'}
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900 truncate">
            {doc?.title || (loading ? 'Loading…' : 'Document')}
          </h2>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setTab('body')}
              className={`text-xs font-bold px-3 py-1 rounded-lg ${tab === 'body' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}
            >
              Document
            </button>
            <button
              type="button"
              onClick={() => setTab('meta')}
              className={`text-xs font-bold px-3 py-1 rounded-lg ${tab === 'meta' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}
            >
              Front matter
            </button>
            <button
              type="button"
              disabled={!doc}
              onClick={() => onReadAloud(plainForSpeech)}
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg bg-zinc-900 text-white disabled:opacity-40"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Read aloud
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-zinc-100 p-4 bg-zinc-50/80 text-xs space-y-2">
          {doc && (
            <>
              <div>
                <span className="text-zinc-400 font-bold uppercase">Status</span>
                <p className={showDiagnosticsChrome ? 'font-mono text-zinc-800' : 'text-zinc-800'}>{doc.status}</p>
              </div>
              <div>
                <span className="text-zinc-400 font-bold uppercase">Version</span>
                <p className={showDiagnosticsChrome ? 'font-mono text-zinc-800' : 'text-zinc-800'}>{doc.version}</p>
              </div>
              <div>
                <span className="text-zinc-400 font-bold uppercase">Category</span>
                <p className={showDiagnosticsChrome ? 'font-mono text-zinc-800' : 'text-zinc-800'}>{doc.category}</p>
              </div>
              {showDiagnosticsChrome ? (
                <div>
                  <span className="text-zinc-400 font-bold uppercase">Path</span>
                  <p className="font-mono text-zinc-700 break-all">{doc.path}</p>
                </div>
              ) : null}
            </>
          )}
        </aside>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 pb-8 custom-scrollbar">
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            </div>
          )}
          {dataPhase === 'error' && error && (
            <div className="py-12 text-center">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && dataPhase !== 'error' && tab === 'meta' && (
            <pre
              className={
                showDiagnosticsChrome
                  ? 'text-xs font-mono text-zinc-700 whitespace-pre-wrap bg-zinc-50 p-4 rounded-xl border border-zinc-100'
                  : 'text-sm text-zinc-700 whitespace-pre-wrap bg-zinc-50 p-4 rounded-xl border border-zinc-100 leading-relaxed'
              }
            >
              {meta || '(no front matter)'}
            </pre>
          )}
          {!loading && dataPhase !== 'error' && tab === 'body' && doc && (
            <article
              className="text-sm text-zinc-800 space-y-4 leading-relaxed max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_a]:text-emerald-600 [&_code]:text-xs [&_code]:bg-zinc-100 [&_code]:px-1 [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
