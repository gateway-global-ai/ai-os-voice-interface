/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { motion } from 'motion/react';
import { GitBranch, Loader2 } from 'lucide-react';
import type { DocumentListItem } from '../governance/canvasBridge';
import type { GovernanceDataPhase } from '../governance/GovernanceCanvasContext';

type Props = {
  documents: DocumentListItem[];
  selectedId: string;
  versions: Array<Record<string, unknown>>;
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  lifecycleBusy: boolean;
  onRetry: () => void;
  onSelectDocumentId: (id: string) => void;
  onClose: () => void;
};

const STAGES = [
  { id: 'draft', label: 'Draft' },
  { id: 'round_1_review', label: 'Round 1 review' },
  { id: 'revision', label: 'Revision' },
  { id: 'round_2_review', label: 'Round 2 review' },
  { id: 'ratified', label: 'Ratified' },
];

function stageIndex(status: string): number {
  const i = STAGES.findIndex((s) => s.id === status);
  return i >= 0 ? i : 0;
}

export function LifecyclePanelOverlay({
  documents: docs,
  selectedId,
  versions,
  dataPhase,
  dataError,
  lifecycleBusy,
  onRetry,
  onSelectDocumentId,
  onClose,
}: Props) {
  const loading = dataPhase === 'loading';
  const selected = docs.find((d) => d.document_id === selectedId);
  const idx = selected ? stageIndex(selected.status) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-2xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 border-b border-zinc-100 flex items-center gap-3">
        <div className="p-3 bg-sky-500/10 rounded-2xl">
          <GitBranch className="w-7 h-7 text-sky-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Governance · Lifecycle</h2>
          <p className="text-sm text-zinc-500">Surface: lifecycle status and archived ratified copies</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-8 custom-scrollbar space-y-6">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        )}
        {dataPhase === 'error' && dataError && (
          <div className="py-8 text-center">
            <p className="text-red-600 text-sm">{dataError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold"
            >
              Retry
            </button>
          </div>
        )}
        {dataPhase === 'empty' && !loading && (
          <p className="text-sm text-zinc-600 text-center py-8">
            No documents in the registry. Start the governance API and ensure DOCUMENT_REGISTRY.json is
            populated.
          </p>
        )}
        {!loading && dataPhase !== 'error' && dataPhase !== 'empty' && (
          <>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-400">Document</label>
              <select
                value={selectedId}
                onChange={(e) => onSelectDocumentId(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm"
              >
                {docs
                  .filter((d) => d.document_id)
                  .map((d) => (
                    <option key={d.document_id} value={d.document_id}>
                      {d.document_id} — {d.title}
                    </option>
                  ))}
              </select>
            </div>

            {selected && (
              <>
                <div>
                  <h3 className="text-xs font-bold uppercase text-zinc-400 mb-3">Lifecycle pipeline</h3>
                  <div className="flex flex-wrap gap-2">
                    {STAGES.map((s, i) => (
                      <div
                        key={s.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${
                          i <= idx
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-white border border-current flex items-center justify-center text-[10px]">
                          {i + 1}
                        </span>
                        {s.label}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    Current status: <strong className="text-zinc-800">{selected.status}</strong>. Full
                    lifecycle (peer review, revision) runs via{' '}
                    <code className="bg-zinc-100 px-1 rounded">govern.py</code> or CLI scripts on your
                    machine.
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase text-zinc-400 mb-2">Versions</h3>
                  {lifecycleBusy ? (
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                  ) : versions.length === 0 ? (
                    <p className="text-sm text-zinc-500">No archived versions yet (ratify to archive).</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {versions.map((v, i) => (
                        <li
                          key={i}
                          className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 font-mono text-xs"
                        >
                          {(v.version as string) || '?'} — {(v.path as string) || ''}
                          {v.current ? ' (current)' : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 flex justify-center">
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
