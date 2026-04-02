/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState, type DragEvent } from 'react';
import { motion } from 'motion/react';
import { ClipboardCheck, Upload, Loader2 } from 'lucide-react';
import { checkCompliancePrimitive, checkComplianceKit } from '../governance/canvasBridge';
import type { GovernanceDataPhase } from '../governance/GovernanceCanvasContext';

type Props = {
  primitiveNames: string[];
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  onRetry: () => void;
  onClose: () => void;
};

export function ComplianceCheckOverlay({
  primitiveNames,
  dataPhase,
  dataError,
  onRetry,
  onClose,
}: Props) {
  const [mode, setMode] = useState<'primitive' | 'kit'>('primitive');
  const [primitiveType, setPrimitiveType] = useState('NodeContract');
  const [jsonText, setJsonText] = useState('{\n  "type": "object"\n}');
  const [runLoading, setRunLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (primitiveNames.length > 0) {
      setPrimitiveType((prev) => (primitiveNames.includes(prev) ? prev : primitiveNames[0]));
    }
  }, [primitiveNames]);

  const surfaceLoading = dataPhase === 'loading';

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/json') {
      f.text().then(setJsonText).catch(() => {});
    }
  };

  const runCheck = async () => {
    setLocalError(null);
    setResult(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      setLocalError('Invalid JSON');
      return;
    }
    setRunLoading(true);
    try {
      if (mode === 'primitive') {
        const r = await checkCompliancePrimitive(primitiveType, parsed);
        setResult(r as unknown as Record<string, unknown>);
      } else {
        const r = await checkComplianceKit(parsed);
        setResult(r as unknown as Record<string, unknown>);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setRunLoading(false);
    }
  };

  const violations = (result?.violations as Array<Record<string, unknown>>) || [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-3xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-zinc-200 shadow-2xl overflow-hidden"
    >
      <div className="p-6 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <ClipboardCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Governance · Compliance</h2>
            <p className="text-sm text-zinc-500">Surface: validate primitives or Kit manifest JSON</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => setMode('primitive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${mode === 'primitive' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700'}`}
          >
            Primitive
          </button>
          <button
            type="button"
            onClick={() => setMode('kit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${mode === 'kit' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700'}`}
          >
            Kit manifest
          </button>
        </div>
        {mode === 'primitive' && (
          <select
            value={primitiveType}
            onChange={(e) => setPrimitiveType(e.target.value)}
            disabled={surfaceLoading || primitiveNames.length === 0}
            className="mt-3 w-full md:w-auto px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm"
          >
            {(primitiveNames.length ? primitiveNames : ['NodeContract']).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pb-8 space-y-4 custom-scrollbar">
        {surfaceLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          </div>
        )}
        {dataPhase === 'error' && dataError && (
          <div className="py-8 text-center">
            <p className="text-red-600 text-sm">{dataError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold"
            >
              Retry
            </button>
          </div>
        )}
        {dataPhase === 'empty' && !surfaceLoading && (
          <p className="text-sm text-zinc-600 text-center py-8">
            No compliance primitives returned from the API. Check the governance service.
          </p>
        )}
        {!surfaceLoading && dataPhase !== 'error' && dataPhase !== 'empty' && (
          <>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="border-2 border-dashed border-zinc-200 rounded-2xl p-6 text-center text-sm text-zinc-500 hover:border-emerald-300 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
              Drop a .json file or edit below
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-48 font-mono text-xs p-4 rounded-xl border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            {localError && <p className="text-red-600 text-sm">{localError}</p>}
            <button
              type="button"
              onClick={runCheck}
              disabled={runLoading}
              className="w-full py-3 rounded-xl bg-zinc-900 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {runLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Run validation
            </button>
            {result && (
              <div
                className={`rounded-2xl p-4 border ${(result.valid as boolean) ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
              >
                <p className="font-bold text-sm">
                  {(result.valid as boolean) ? 'VALID' : 'INVALID'}
                </p>
                {violations.length > 0 && (
                  <ul className="mt-2 space-y-2 text-xs">
                    {violations.map((v, i) => (
                      <li key={i} className="bg-white/80 p-2 rounded-lg border border-zinc-100">
                        <span className="font-bold text-red-700">{String(v.severity)}</span>{' '}
                        <span className="font-mono">{String(v.rule)}</span>
                        <p className="text-zinc-700 mt-1">{String(v.message)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
