/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import type { ConflictScanResult } from '../governance/canvasBridge';
import type { GovernanceDataPhase } from '../governance/GovernanceCanvasContext';

type Props = {
  scan: ConflictScanResult | null;
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onRetry: () => void;
  onClose: () => void;
  documentIdFilter?: string;
};

function severityClass(sev: string): string {
  if (sev === 'high') return 'bg-red-100 text-red-800 border-red-200';
  if (sev === 'medium') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-zinc-100 text-zinc-700 border-zinc-200';
}

export function ConflictScanOverlay({ scan, dataPhase, dataError, onRetry, onClose, documentIdFilter }: Props) {
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const loading = dataPhase === 'loading';
  const data = scan;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-3xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 border-b border-zinc-100 flex items-center gap-3">
        <div className="p-3 bg-amber-500/10 rounded-2xl">
          <ShieldAlert className="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Governance · Conflicts</h2>
          <p className="text-sm text-zinc-500">
            Surface: conflict results · terms, numbers, references
            {documentIdFilter ? ` · ${documentIdFilter}` : ''}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-8 custom-scrollbar">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          </div>
        )}
        {dataPhase === 'error' && dataError && (
          <div className="py-12 text-center">
            <p className="text-red-600 text-sm">{dataError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-bold"
            >
              Retry
            </button>
          </div>
        )}
        {data && !loading && dataPhase !== 'error' && (
          <>
            <p className="text-sm text-zinc-600 mb-4">
              Scanned <strong>{data.documents_scanned}</strong> documents ·{' '}
              <strong>{data.findings_count}</strong> finding(s) · {data.scan_date}
            </p>
            {data.findings.length === 0 ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-6 text-center">
                <p className="text-emerald-900 font-medium">No conflicts detected.</p>
                <p className="text-sm text-emerald-800/80 mt-2">
                  Would you like to run a compliance check on a NodeContract or Kit manifest?
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.findings.map((f, i) => {
                  const finding = f as {
                    type?: string;
                    severity?: string;
                    message?: string;
                    occurrences?: Array<Record<string, unknown>>;
                  };
                  const isOpen = open[i];
                  return (
                    <li
                      key={i}
                      className="rounded-2xl border border-zinc-100 bg-zinc-50/80 overflow-hidden"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 p-4 text-left"
                        onClick={() => setOpen((s) => ({ ...s, [i]: !s[i] }))}
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 shrink-0 text-zinc-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0 text-zinc-400" />
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${severityClass(String(finding.severity || 'low'))}`}
                        >
                          {finding.severity || 'info'}
                        </span>
                        <span className="text-xs font-mono text-zinc-500">{finding.type}</span>
                        <span className="text-sm text-zinc-800 flex-1 truncate">
                          {finding.message}
                        </span>
                      </button>
                      {isOpen && finding.occurrences && (
                        <div className="px-4 pb-4 pl-12 text-xs text-zinc-600 space-y-1">
                          {finding.occurrences.map((occ, j) => (
                            <pre key={j} className="font-mono bg-white p-2 rounded-lg border border-zinc-100 overflow-x-auto">
                              {JSON.stringify(occ, null, 2)}
                            </pre>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
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
