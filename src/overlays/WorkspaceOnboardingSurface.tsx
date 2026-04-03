/**
 * Governed Workspace entry gate — connect recommendation before hub (AIOS-SPEC-007).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Building2, ChevronRight, Loader2, Shield } from 'lucide-react';
import type { WorkspaceState } from '../shell/workspaceState';

type Props = {
  workspaceState: WorkspaceState;
  connecting?: boolean;
  onConnect: () => void;
  onContinueWithout: () => void;
  onClose: () => void;
};

export function WorkspaceOnboardingSurface({
  workspaceState,
  connecting = false,
  onConnect,
  onContinueWithout,
  onClose,
}: Props) {
  const canConnect =
    workspaceState === 'unknown' || workspaceState === 'error' || workspaceState === 'connecting';
  const showEnvHint = workspaceState === 'not_configured';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-4xl mx-2 md:mx-4 max-h-[calc(100dvh-var(--shell-footer-height,6rem)-2rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-sky-200/80 shadow-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-zinc-100 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 rounded-2xl">
              <Building2 className="w-7 h-7 text-sky-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Google Workspace</p>
              <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">
                Connect your workspace
              </h2>
              <p className="text-zinc-500 text-sm mt-1 max-w-xl">
                Link Google Workspace through the governed MCP path to unlock calendar and future read
                surfaces — all traffic routes through the Integration Control Plane (AIOS-SPEC-007), not
                raw browser calls.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sky-700 text-xs font-bold">
            <Shield className="w-4 h-4" />
            <span>Gate</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 space-y-4">
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm text-zinc-700 space-y-2">
          <p className="font-semibold text-zinc-900">Why connect</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Calendar and Workspace tools use the same audited control plane as governance.</li>
            <li>Your session stays on the AI OS shell — no parallel &quot;app folder&quot; shortcuts.</li>
            <li>Operators configure <code className="text-xs bg-zinc-200/60 px-1 rounded">VITE_WORKSPACE_MCP_URL</code> for the MCP server.</li>
          </ul>
        </div>

        {showEnvHint ? (
          <div
            role="status"
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-bold">MCP URL not configured</p>
            <p className="mt-1">
              Set <code className="text-xs bg-amber-100 px-1 rounded">VITE_WORKSPACE_MCP_URL</code> in your
              environment and restart the dev server. You can continue without connecting and return from
              Governance later.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            disabled={!canConnect || connecting}
            onClick={onConnect}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 text-white font-semibold px-6 py-3 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {connecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                Connect Workspace
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onContinueWithout}
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Continue without connecting
          </button>
        </div>
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
