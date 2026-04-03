/**
 * Google Workspace governed hub (AIOS-SPEC-007 Phase 1 — read plane shell).
 * MCP calls go through Integration Control Plane — not from this component.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Building2, Calendar, ChevronLeft, Shield } from 'lucide-react';
import type { GovernanceDataPhase } from '../governance/GovernanceCanvasContext';

type Props = {
  mode: 'hub' | 'calendar';
  dataPhase: GovernanceDataPhase;
  onClose: () => void;
  onOpenCalendar?: () => void;
  onBackToHub?: () => void;
};

export function WorkspaceHubSurface({
  mode,
  dataPhase,
  onClose,
  onOpenCalendar,
  onBackToHub,
}: Props) {
  const loading = dataPhase === 'loading';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-4xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-sky-200/80 shadow-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-zinc-100 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 rounded-2xl">
              <Building2 className="w-7 h-7 text-sky-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Workspace (governed)
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">
                {mode === 'calendar' ? 'Calendar — read plane' : 'Google Workspace'}
              </h2>
              <p className="text-zinc-500 text-sm mt-1 max-w-xl">
                Phase 1: read-only intents per AIOS-SPEC-007. Tools are not exposed here — routing
                goes through the Integration Control Plane and MCP adapter.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sky-700 text-xs font-bold">
            <Shield className="w-4 h-4" />
            <span>SPEC-007</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 space-y-4">
        {loading ? (
          <p className="text-zinc-500 text-sm">Loading…</p>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900 mb-2">Load state: ok</p>
              <p>
                Configure <code className="text-xs bg-zinc-200/60 px-1 rounded">VITE_WORKSPACE_MCP_URL</code>{' '}
                when the Workspace MCP server is deployed. Until then, the control plane returns{' '}
                <code className="text-xs bg-zinc-200/60 px-1 rounded">not_configured</code> for API
                calls — the UI shell remains governed and auditable.
              </p>
            </div>
            {mode === 'hub' && onOpenCalendar && (
              <button
                type="button"
                onClick={onOpenCalendar}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left hover:border-sky-300 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-zinc-900">
                  <Calendar className="w-5 h-5 text-sky-600" />
                  Calendar (read plane)
                </span>
                <ChevronLeft className="w-4 h-4 text-zinc-400 rotate-180" />
              </button>
            )}
            {mode === 'calendar' && onBackToHub && (
              <button
                type="button"
                onClick={onBackToHub}
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Workspace hub
              </button>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 flex justify-end shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}
