/**
 * Google Workspace governed hub (AIOS-SPEC-007 Phase 1 — read plane shell).
 * MCP calls go through Integration Control Plane — not from this component.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Building2, Calendar, ChevronLeft, Loader2, Mail, Shield } from 'lucide-react';
import type { GovernanceDataPhase } from '../governance/GovernanceCanvasContext';
import type {
  GovernanceWorkspaceCalendarRead,
  GovernanceWorkspaceMailRead,
  GovernanceWorkspaceMailSearch,
} from '../governance/loadGovernancePayload';

type Props = {
  /** Hub renders only when Workspace gate is satisfied (connected). */
  connected: boolean;
  mode: 'hub' | 'calendar' | 'mail';
  dataPhase: GovernanceDataPhase;
  dataError?: string | null;
  /** Calendar read-plane outcome (from `loadGovernancePayload` → control plane). */
  calendarRead?: GovernanceWorkspaceCalendarRead;
  /** Mail search outcome (`workspace.mail.search`). */
  mailSearch?: GovernanceWorkspaceMailSearch;
  /** Mail single-message read (`workspace.mail.read`) when `mailMessageId` was supplied to load. */
  mailRead?: GovernanceWorkspaceMailRead;
  onClose: () => void;
  onOpenCalendar?: () => void;
  onOpenMail?: () => void;
  onBackToHub?: () => void;
  /** Load `workspace.mail.read` for this message id (reloads mail hub payload). */
  onReadMail?: (messageId: string) => void;
  /** Clear message read selection (search-only hub). */
  onClearMailRead?: () => void;
};

export function WorkspaceHubSurface({
  connected,
  mode,
  dataPhase,
  dataError,
  calendarRead,
  mailSearch,
  mailRead,
  onClose,
  onOpenCalendar,
  onOpenMail,
  onBackToHub,
  onReadMail,
  onClearMailRead,
}: Props) {
  if (!connected) {
    return null;
  }
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
                {mode === 'calendar'
                  ? 'Calendar — read plane'
                  : mode === 'mail'
                    ? 'Mail — read plane'
                    : 'Google Workspace'}
              </h2>
              <p className="text-zinc-500 text-sm mt-1 max-w-xl">
                Phase 1: read-only intents per AIOS-SPEC-007. Routing goes through the Integration
                Control Plane and MCP adapter (no direct MCP from this UI).
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
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
            <p className="text-zinc-500 text-sm">Loading workspace data…</p>
          </div>
        ) : dataError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
          >
            <p className="font-bold">Load failed</p>
            <p className="mt-1">{dataError}</p>
          </div>
        ) : (
          <>
            {mode === 'hub' && (
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900 mb-2">Workspace hub</p>
                <p>
                  Open Calendar or Mail to run{' '}
                  <code className="text-xs bg-zinc-200/60 px-1 rounded">workspace.calendar.list</code> or{' '}
                  <code className="text-xs bg-zinc-200/60 px-1 rounded">workspace.mail.search</code> through the
                  control plane. Configure{' '}
                  <code className="text-xs bg-zinc-200/60 px-1 rounded">VITE_WORKSPACE_MCP_URL</code> for live
                  MCP. Empty search query is sent until the MCP tool defines defaults.
                </p>
              </div>
            )}

            {mode === 'calendar' && calendarRead && (
              <CalendarReadPanel read={calendarRead} />
            )}

            {mode === 'mail' && mailSearch && (
              <MailMailModePanels
                mailSearch={mailSearch}
                mailRead={mailRead}
                onReadMail={onReadMail}
                onClearMailRead={onClearMailRead}
              />
            )}

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
            {mode === 'hub' && onOpenMail && (
              <button
                type="button"
                onClick={onOpenMail}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left hover:border-sky-300 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-zinc-900">
                  <Mail className="w-5 h-5 text-sky-600" />
                  Mail (read plane)
                </span>
                <ChevronLeft className="w-4 h-4 text-zinc-400 rotate-180" />
              </button>
            )}
            {(mode === 'calendar' || mode === 'mail') && onBackToHub && (
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

function CalendarReadPanel({ read }: { read: GovernanceWorkspaceCalendarRead }) {
  if (read.loadState === 'not_configured') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          MCP not configured
        </p>
        <p className="mt-2 text-amber-900/90">
          Set <code className="text-xs bg-amber-100 px-1 rounded">VITE_WORKSPACE_MCP_URL</code> to your
          Workspace MCP base URL. The control plane returned{' '}
          <code className="text-xs bg-amber-100 px-1 rounded">not_configured</code>.
        </p>
        {read.errorMessage ? (
          <p className="mt-2 text-xs font-mono text-amber-950/80">{read.errorMessage}</p>
        ) : null}
        {read.auditId ? (
          <p className="mt-2 text-xs text-amber-800">Audit: {read.auditId}</p>
        ) : null}
      </div>
    );
  }

  if (read.loadState === 'error') {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
      >
        <p className="font-bold">Calendar read failed</p>
        <p className="mt-1">{read.errorMessage ?? 'Unknown error'}</p>
        <p className="mt-2 text-xs text-red-800">
          {read.controlPlaneCode ? `Control plane: ${read.controlPlaneCode}` : null}
          {read.adapterCode ? ` · Adapter: ${read.adapterCode}` : null}
        </p>
        {read.auditId ? <p className="mt-2 text-xs font-mono text-red-900/80">Audit: {read.auditId}</p> : null}
      </div>
    );
  }

  if (read.loadState === 'empty') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900 mb-1">No calendars (empty)</p>
        <p>The MCP adapter returned an empty list. This is distinct from a load failure.</p>
        {read.auditId ? <p className="mt-2 text-xs text-zinc-500">Audit: {read.auditId}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-zinc-800 space-y-2">
      <p className="font-semibold text-emerald-900">Calendar data (read plane)</p>
      <p className="text-xs text-zinc-600">
        Structured result from <code className="bg-white/80 px-1 rounded">workspace.calendar.list</code> via
        MCP JSON-RPC.
      </p>
      <pre className="text-xs bg-white/90 border border-zinc-100 rounded-xl p-3 overflow-x-auto max-h-48">
        {JSON.stringify(read.data, null, 2)}
      </pre>
      {read.auditId ? <p className="text-xs text-zinc-500">Audit: {read.auditId}</p> : null}
    </div>
  );
}

function MailSearchPanel({ read }: { read: GovernanceWorkspaceMailSearch }) {
  if (read.loadState === 'not_configured') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          MCP not configured
        </p>
        <p className="mt-2 text-amber-900/90">
          Set <code className="text-xs bg-amber-100 px-1 rounded">VITE_WORKSPACE_MCP_URL</code> to your Workspace
          MCP base URL. The control plane returned{' '}
          <code className="text-xs bg-amber-100 px-1 rounded">not_configured</code>.
        </p>
        {read.errorMessage ? (
          <p className="mt-2 text-xs font-mono text-amber-950/80">{read.errorMessage}</p>
        ) : null}
        {read.auditId ? <p className="mt-2 text-xs text-amber-800">Audit: {read.auditId}</p> : null}
      </div>
    );
  }

  if (read.loadState === 'error') {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
      >
        <p className="font-bold">Mail search failed</p>
        <p className="mt-1">{read.errorMessage ?? 'Unknown error'}</p>
        <p className="mt-2 text-xs text-red-800">
          {read.controlPlaneCode ? `Control plane: ${read.controlPlaneCode}` : null}
          {read.adapterCode ? ` · Adapter: ${read.adapterCode}` : null}
        </p>
        {read.auditId ? <p className="mt-2 text-xs font-mono text-red-900/80">Audit: {read.auditId}</p> : null}
      </div>
    );
  }

  if (read.loadState === 'empty') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900 mb-1">No messages (empty)</p>
        <p>The MCP adapter returned an empty result. This is distinct from a load failure.</p>
        {read.auditId ? <p className="mt-2 text-xs text-zinc-500">Audit: {read.auditId}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-zinc-800 space-y-2">
      <p className="font-semibold text-emerald-900">Mail search (read plane)</p>
      <p className="text-xs text-zinc-600">
        Structured result from <code className="bg-white/80 px-1 rounded">workspace.mail.search</code> via MCP
        JSON-RPC.
      </p>
      <pre className="text-xs bg-white/90 border border-zinc-100 rounded-xl p-3 overflow-x-auto max-h-48">
        {JSON.stringify(read.data, null, 2)}
      </pre>
      {read.auditId ? <p className="text-xs text-zinc-500">Audit: {read.auditId}</p> : null}
    </div>
  );
}

function MailMailModePanels({
  mailSearch,
  mailRead,
  onReadMail,
  onClearMailRead,
}: {
  mailSearch: GovernanceWorkspaceMailSearch;
  mailRead?: GovernanceWorkspaceMailRead;
  onReadMail?: (messageId: string) => void;
  onClearMailRead?: () => void;
}) {
  const [draftId, setDraftId] = useState('');

  return (
    <div className="space-y-4">
      {mailRead ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {onClearMailRead ? (
              <button
                type="button"
                onClick={onClearMailRead}
                className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to search results
              </button>
            ) : null}
          </div>
          <MailReadPanel read={mailRead} />
        </div>
      ) : null}

      <div className={mailRead ? 'rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3' : ''}>
        {!mailRead ? (
          <MailSearchPanel read={mailSearch} />
        ) : (
          <details className="text-sm text-zinc-600">
            <summary className="cursor-pointer font-medium text-zinc-800">Search results (JSON)</summary>
            <div className="mt-2 max-h-40 overflow-auto">
              <MailSearchPanel read={mailSearch} />
            </div>
          </details>
        )}
      </div>

      {!mailRead && onReadMail ? (
        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 space-y-2">
          <p className="text-sm font-medium text-zinc-900">Read one message</p>
          <p className="text-xs text-zinc-600">
            Runs <code className="rounded bg-white/80 px-1">workspace.mail.read</code> with{' '}
            <code className="rounded bg-white/80 px-1">resource_ref</code> (message id). Paste an id from your MCP
            search payload.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={draftId}
              onChange={(e) => setDraftId(e.target.value)}
              placeholder="Message id"
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            />
            <button
              type="button"
              disabled={!draftId.trim()}
              onClick={() => onReadMail(draftId.trim())}
              className="shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
            >
              Load message
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MailReadPanel({ read }: { read: GovernanceWorkspaceMailRead }) {
  if (read.loadState === 'not_configured') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          MCP not configured
        </p>
        <p className="mt-2 text-amber-900/90">Cannot read message — Workspace MCP URL is missing.</p>
        {read.errorMessage ? (
          <p className="mt-2 text-xs font-mono text-amber-950/80">{read.errorMessage}</p>
        ) : null}
      </div>
    );
  }

  if (read.loadState === 'error') {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
      >
        <p className="font-bold">Message read failed</p>
        <p className="mt-1">{read.errorMessage ?? 'Unknown error'}</p>
        <p className="mt-2 text-xs text-red-800">
          {read.controlPlaneCode ? `Control plane: ${read.controlPlaneCode}` : null}
          {read.adapterCode ? ` · Adapter: ${read.adapterCode}` : null}
        </p>
        {read.auditId ? <p className="mt-2 text-xs font-mono text-red-900/80">Audit: {read.auditId}</p> : null}
      </div>
    );
  }

  if (read.loadState === 'empty') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900 mb-1">Empty message payload</p>
        <p>Adapter returned success but no readable body was detected (heuristic).</p>
        {read.auditId ? <p className="mt-2 text-xs text-zinc-500">Audit: {read.auditId}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-zinc-800 space-y-2">
      <p className="font-semibold text-violet-900">Message (read plane)</p>
      <p className="text-xs text-zinc-600">
        Structured result from <code className="rounded bg-white/80 px-1">workspace.mail.read</code> via MCP
        JSON-RPC.
      </p>
      <pre className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-zinc-100 bg-white/90 p-3 text-xs">
        {JSON.stringify(read.data, null, 2)}
      </pre>
      {read.auditId ? <p className="text-xs text-zinc-500">Audit: {read.auditId}</p> : null}
    </div>
  );
}
