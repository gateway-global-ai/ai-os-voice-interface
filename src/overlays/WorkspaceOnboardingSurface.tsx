/**
 * Governed Workspace entry gate — connect recommendation before hub (AIOS-SPEC-007).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Building2, ChevronRight, Loader2, Shield } from 'lucide-react';
import { GoogleWorkspaceSignInBar } from '../components/workspace/GoogleWorkspaceSignInBar';
import type { WorkspaceState } from '../shell/workspaceState';
import { useDiagnosticsChromeEnabled } from '../shell/DiagnosticsChromeContext';

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
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const canConnect =
    workspaceState === 'unknown' || workspaceState === 'error' || workspaceState === 'connecting';
  const showEnvHint = workspaceState === 'not_configured';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 mx-2 flex max-h-[calc(100dvh-var(--shell-footer-height,6rem)-2rem)] min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-3xl shadow-2xl md:mx-4"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        backdropFilter: 'blur(22px)',
      }}
    >
      <div className="shrink-0 border-b p-6 md:p-8" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="rounded-2xl p-3"
              style={{
                background: 'var(--panel-accent-bg)',
                border: '1px solid var(--panel-accent-border)',
                color: 'var(--panel-accent-text)',
              }}
            >
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--panel-text-muted)' }}>
                Google Workspace
              </p>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: 'var(--panel-heading)' }}>
                Connect your workspace
              </h2>
              <p className="mt-1 max-w-xl text-sm" style={{ color: 'var(--panel-text-muted)' }}>
                Link Google Workspace through the governed MCP path to unlock calendar and future read
                surfaces — all traffic routes through the Integration Control Plane (AIOS-SPEC-007), not
                raw browser calls.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--panel-accent-text)' }}>
            <Shield className="w-4 h-4" />
            <span>Gate</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-6 md:p-8">
        <div
          className="space-y-2 rounded-2xl p-4 text-sm"
          style={{
            background: 'var(--panel-surface)',
            border: '1px solid var(--panel-border)',
            color: 'var(--panel-text-muted)',
          }}
        >
          <p className="font-semibold" style={{ color: 'var(--panel-heading)' }}>
            Why connect
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Calendar and Workspace tools use the same audited integration control plane.</li>
            <li>Your session stays on the AI OS shell — no parallel &quot;app folder&quot; shortcuts.</li>
            {showDiagnosticsChrome ? (
              <li>
                Operators configure{' '}
                <code
                  className="rounded px-1 text-xs"
                  style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--panel-text)' }}
                >
                  VITE_WORKSPACE_MCP_URL
                </code>{' '}
                for the MCP server.
              </li>
            ) : null}
            <li>
              Use <strong>Sign in with Google</strong> below for MCP OAuth 2.1 — “Connect Workspace” alone does not log
              you into Google.
            </li>
          </ul>
        </div>

        <GoogleWorkspaceSignInBar />

        {showEnvHint ? (
          <div
            role="status"
            className="rounded-2xl px-4 py-3 text-sm"
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fcd34d',
            }}
          >
            <p className="font-bold">MCP URL not configured</p>
            <p className="mt-1">
              Set <code className="rounded px-1 text-xs" style={{ background: 'rgba(2,6,23,0.28)' }}>VITE_WORKSPACE_MCP_URL</code> in your
              environment and restart the dev server. You can close this panel and return later.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            disabled={!canConnect || connecting}
            onClick={onConnect}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'var(--panel-accent-bg)',
              border: '1px solid var(--panel-accent-border)',
              color: 'var(--panel-accent-text)',
            }}
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
            title="Skip Workspace connection for now"
            onClick={onContinueWithout}
            className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-medium"
            style={{
              background: 'var(--panel-surface)',
              border: '1px solid var(--panel-border)',
              color: 'var(--panel-text)',
            }}
          >
            Skip for now
          </button>
        </div>
      </div>

      <div className="flex shrink-0 justify-end border-t p-4" style={{ borderColor: 'var(--panel-border)' }}>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm font-medium"
          style={{
            background: 'var(--panel-surface)',
            border: '1px solid var(--panel-border)',
            color: 'var(--panel-text)',
          }}
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}
