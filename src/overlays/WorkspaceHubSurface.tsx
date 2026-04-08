/**
 * Google Workspace hub (AIOS-SPEC-007 — read plane + extended tool surfaces).
 * MCP calls go through Integration Control Plane — not from this component.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  ChevronLeft,
  FolderSearch,
  Loader2,
  Mail,
  Search,
  Shield,
  Users,
} from 'lucide-react';
import { GoogleWorkspaceSignInBar } from '../components/workspace/GoogleWorkspaceSignInBar';
import { ContactsReadPanel } from '../components/workspace/ContactsReadPanel';
import { WorkspaceGoogleCloudApiDisabledHint } from '../components/workspace/WorkspaceGoogleCloudApiDisabledHint';
import { WorkspaceMcpPseHint } from '../components/workspace/WorkspaceMcpPseHint';
import type { WorkspaceDataPhase } from '../shellCanvas/WorkspaceCanvasContext';
import type {
  WorkspaceCalendarRead,
  WorkspaceMailReviewSlice,
  WorkspaceMailRead,
  WorkspaceMailSearch,
  WorkspaceToolRead,
} from '../shellCanvas/loadWorkspacePayload';
import type { ExecutionPlanDecision } from '../intent/executionPlanPolicy';
import {
  type MailSearchRow,
  mailSearchRowsHaveClickTargets,
  normalizeMailSearchRows,
} from '../workspace/mailSearchRows';
import {
  extractGmailMessageIdsFromSearchText,
  extractMcpRowArray,
  normalizeMcpText,
  summarizeMcpRow,
} from '../workspace/workspaceMcpDisplay';
import { MailMessageActionsPanel } from './MailMessageActionsPanel';
import { runWorkspaceControlPlane } from '../workspace/integrationControlPlane';
import { buildCalendarEventsListScope, buildCalendarGetScope } from '../scope/buildExecutionScope';
import {
  normalizeCalendarListFromMcpPayload,
  parseCalendarEventRowsFromGetEventsText,
} from '../workspace/calendarMcpParse';
import { computeCalendarPeriodRange, type CalendarPeriodPreset } from '../workspace/calendarTimeRange';
import { useDiagnosticsChromeEnabled } from '../shell/DiagnosticsChromeContext';

type WorkspaceSurfaceMode = 'hub' | 'calendar' | 'mail' | 'drive' | 'contacts' | 'search';

function workspaceSurfaceCopy(mode: WorkspaceSurfaceMode): { title: string; subtitle: string } {
  switch (mode) {
    case 'calendar':
      return {
        title: 'Calendar',
        subtitle: 'List calendars and events from your Google account (read-only).',
      };
    case 'mail':
      return {
        title: 'Mail',
        subtitle: 'Search your inbox and open messages. Sign in above so requests include your Google token.',
      };
    case 'drive':
      return {
        title: 'Drive',
        subtitle:
          'List and search files in Google Drive (read-only). Results load through the integration control plane.',
      };
    case 'contacts':
      return {
        title: 'Contacts',
        subtitle: 'Contacts loaded from your account (People API connections list).',
      };
    case 'search':
      return {
        title: 'Web search',
        subtitle:
          'Uses Google Programmable Search on the MCP host (needs GOOGLE_PSE_API_KEY / GOOGLE_PSE_ENGINE_ID).',
      };
    default:
      return {
        title: 'Google Workspace',
        subtitle: 'Use the tools below with your connected account. The integration control plane routes every action.',
      };
  }
}

type Props = {
  /** Hub renders only when Workspace gate is satisfied (connected). */
  connected: boolean;
  mode: WorkspaceSurfaceMode;
  dataPhase: WorkspaceDataPhase;
  dataError?: string | null;
  /** Calendar read-plane outcome (from `loadWorkspacePayload` → control plane). */
  calendarRead?: WorkspaceCalendarRead;
  /** Mail search outcome (`workspace.mail.search`). */
  mailSearch?: WorkspaceMailSearch;
  /** Mail single-message read (`workspace.mail.read`) when `mailMessageId` was supplied to load. */
  mailRead?: WorkspaceMailRead;
  /** Route message id when a message is open — mail actions use this as a stable id. */
  openMailMessageId?: string;
  /** Drive / Contacts / Web search — same load shape as mail search. */
  toolRead?: WorkspaceToolRead;
  onClose: () => void;
  onOpenCalendar?: () => void;
  onOpenMail?: () => void;
  onOpenDrive?: () => void;
  onOpenContacts?: () => void;
  onOpenSearch?: () => void;
  onBackToHub?: () => void;
  /** Load `workspace.mail.read` for this message id (reloads mail hub payload). */
  onReadMail?: (messageId: string) => void;
  /** Clear message read selection (search-only hub). */
  onClearMailRead?: () => void;
  /** After GIS sign-in/out, re-fetch calendar/mail hub so MCP uses new Bearer. */
  onWorkspaceGoogleAuthChange: () => void;
};

export function WorkspaceHubSurface({
  connected,
  mode,
  dataPhase,
  dataError,
  calendarRead,
  mailSearch,
  mailRead,
  openMailMessageId,
  toolRead,
  onClose,
  onOpenCalendar,
  onOpenMail,
  onOpenDrive,
  onOpenContacts,
  onOpenSearch,
  onBackToHub,
  onReadMail,
  onClearMailRead,
  onWorkspaceGoogleAuthChange,
}: Props) {
  if (!connected) {
    return null;
  }
  const loading = dataPhase === 'loading';
  const { title: surfaceTitle, subtitle: surfaceSubtitle } = workspaceSurfaceCopy(mode);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-20 w-full max-w-4xl mx-2 md:mx-4 max-h-[calc(100dvh-8rem)] min-h-0 flex flex-col rounded-3xl bg-white/90 backdrop-blur-2xl border border-sky-200/80 shadow-2xl overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-zinc-100 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 bg-sky-500/10 rounded-2xl shrink-0">
              <Building2 className="w-7 h-7 text-sky-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Workspace · read plane
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">
                {surfaceTitle}
              </h2>
              <p className="text-zinc-500 text-sm mt-1 max-w-xl leading-relaxed">{surfaceSubtitle}</p>
            </div>
          </div>
          <details className="shrink-0 text-right max-w-[10rem]">
            <summary className="cursor-pointer list-none flex items-center gap-2 text-sky-700 text-xs font-bold justify-end">
              <Shield className="w-4 h-4" />
              <span>SPEC-007</span>
            </summary>
            <p className="mt-2 text-[10px] text-zinc-400 leading-snug text-left">
              Intents map to MCP tools via the integration control plane; no direct browser→MCP bypass.
            </p>
          </details>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 space-y-4">
        {mode !== 'hub' && onBackToHub ? (
          <div className="sticky top-0 z-10 -mx-2 px-2 py-2 -mt-2 mb-1 bg-white/95 backdrop-blur border-b border-zinc-100/80">
            <button
              type="button"
              onClick={onBackToHub}
              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-800 hover:text-sky-950"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Workspace hub
            </button>
          </div>
        ) : null}
        <GoogleWorkspaceSignInBar onAuthSessionChange={onWorkspaceGoogleAuthChange} />
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
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm text-zinc-700 leading-relaxed">
                <p className="font-semibold text-zinc-900 mb-1">What you can do here</p>
                <p>
                  Connect Google, then open a tool. Results are loaded through the integration control plane (not raw MCP
                  from the browser UI).
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
                openMailMessageId={openMailMessageId}
                onReadMail={onReadMail}
                onClearMailRead={onClearMailRead}
              />
            )}

            {mode === 'drive' && toolRead && (
              <WorkspaceToolReadPanel
                read={toolRead}
                successTitle="Drive list"
                successDescription="Default load uses workspace.drive.list (search_drive_files with empty query). Narrow with voice intents workspace.drive.search or open a file via workspace.drive.read when wired."
              />
            )}
            {mode === 'contacts' && toolRead && (
              <>
                {toolRead.loadState === 'ok' ? (
                  <ContactsReadPanel read={toolRead} />
                ) : (
                  <WorkspaceToolReadPanel
                    read={toolRead}
                    successTitle="Contacts"
                    successDescription="Google Contacts via workspace.contacts.list (People API)."
                  />
                )}
              </>
            )}
            {mode === 'search' && toolRead && (
              <WorkspaceToolReadPanel
                read={toolRead}
                successTitle="Web search"
                successDescription="Custom Search JSON API via MCP. If this errors, set PSE keys on the MCP server."
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
                  Calendar
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
                  Mail
                </span>
                <ChevronLeft className="w-4 h-4 text-zinc-400 rotate-180" />
              </button>
            )}
            {mode === 'hub' && onOpenDrive && (
              <button
                type="button"
                onClick={onOpenDrive}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left hover:border-sky-300 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-zinc-900">
                  <FolderSearch className="w-5 h-5 text-sky-600" />
                  Drive
                </span>
                <ChevronLeft className="w-4 h-4 text-zinc-400 rotate-180" />
              </button>
            )}
            {mode === 'hub' && onOpenContacts && (
              <button
                type="button"
                onClick={onOpenContacts}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left hover:border-sky-300 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-zinc-900">
                  <Users className="w-5 h-5 text-sky-600" />
                  Contacts
                </span>
                <ChevronLeft className="w-4 h-4 text-zinc-400 rotate-180" />
              </button>
            )}
            {mode === 'hub' && onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left hover:border-sky-300 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-zinc-900">
                  <Search className="w-5 h-5 text-sky-600" />
                  Web search (Custom Search)
                </span>
                <ChevronLeft className="w-4 h-4 text-zinc-400 rotate-180" />
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

function policyDecisionCaption(d: ExecutionPlanDecision): string {
  switch (d) {
    case 'auto_approve':
      return 'Auto-approved for read';
    case 'require_proposal':
      return 'Confirmation suggested before execution';
    case 'block':
      return 'Blocked by policy';
    default:
      return 'Policy';
  }
}

/**
 * Drill-in card: single deterministic line after the "Why:" label (trust surface).
 * Keep in sync with policy classes — do not vary casually; server reasons live under "More".
 */
function compactMailReviewWhyLine(slice: WorkspaceMailReviewSlice): string {
  switch (slice.policyDecision) {
    case 'auto_approve':
      return 'auto-approved because this is a known read-only bounded plan.';
    case 'require_proposal':
      return 'proposal required because this plan includes a write action.';
    case 'block':
      return 'blocked because this plan is incomplete.';
    default:
      return '';
  }
}

/** Plain-language trust line for primary users (no policy jargon). */
function primaryMailReviewTrustLine(slice: WorkspaceMailReviewSlice): string {
  switch (slice.policyDecision) {
    case 'auto_approve':
      return 'This search is read-only and limited to your account.';
    case 'require_proposal':
      return 'Some actions may ask for your confirmation before anything is sent.';
    case 'block':
      return 'This request cannot run with the current scope.';
    default:
      return '';
  }
}

function primaryMailReviewCountLine(slice: WorkspaceMailReviewSlice): ReactNode {
  if (slice.estimatedResultCount === undefined) {
    return <span className="text-zinc-600">We could not show a count for this search.</span>;
  }
  if (slice.estimatedResultCount === 0) {
    return <span className="text-zinc-700">No messages matched in this view.</span>;
  }
  return (
    <>
      <span className="font-semibold text-zinc-900">{slice.estimatedResultCount}</span> unread message
      {slice.estimatedResultCount === 1 ? '' : 's'} in the last 7 days (matching this scope).
    </>
  );
}

function MailReviewOutcomeCard({
  slice,
  variant = 'full',
}: {
  slice: WorkspaceMailReviewSlice;
  variant?: 'full' | 'compact';
}) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();

  const countLine =
    slice.estimatedResultCount !== undefined ? (
      <p className="text-xs text-zinc-700 leading-relaxed">
        {slice.estimatedResultCount === 0 ? (
          <>No messages matched this bounded scope.</>
        ) : (
          <>
            Found <span className="font-semibold text-zinc-900">{slice.estimatedResultCount}</span> message
            {slice.estimatedResultCount === 1 ? '' : 's'} in this view (unread in the last 7 days, as scoped).
          </>
        )}
      </p>
    ) : null;

  const rationaleBlock =
    slice.policyDecision === 'auto_approve' && slice.approvalRationale && slice.approvalRationale.length > 0 ? (
      <div className="text-xs text-zinc-600 space-y-1">
        <p className="font-medium text-zinc-800">Why this ran without a proposal step</p>
        <ul className="list-disc pl-4 space-y-0.5 leading-relaxed">
          {slice.approvalRationale.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    ) : null;

  const policyBlock = (
    <>
      <p className="text-xs font-medium text-sky-900">
        {policyDecisionCaption(slice.policyDecision)} <span className="text-zinc-500 font-normal">(SPEC-009)</span>
      </p>
      {rationaleBlock}
      {slice.userMessages.length > 0 ? (
        <ul className="text-xs text-zinc-600 list-disc pl-4 space-y-0.5 leading-relaxed">
          {slice.userMessages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      ) : null}
    </>
  );

  const operatorQuery = showDiagnosticsChrome ? (
    <details className="text-xs text-zinc-500 border-t border-sky-100 pt-2 mt-1">
      <summary className="cursor-pointer font-medium text-zinc-600 select-none">Operator: Gmail query syntax</summary>
      <code className="mt-1 block text-[11px] bg-white/90 px-1.5 py-1 rounded border border-sky-100 text-zinc-800 break-all">
        {slice.gmailQuery}
      </code>
    </details>
  ) : null;

  const countCompact =
    slice.estimatedResultCount !== undefined ? (
      <>
        <span className="font-semibold text-zinc-900">{slice.estimatedResultCount}</span> in the search list for this
        scope
      </>
    ) : (
      <span className="text-zinc-500">— (count not attached to this load)</span>
    );

  if (variant === 'compact') {
    if (!showDiagnosticsChrome) {
      const trust = primaryMailReviewTrustLine(slice);
      return (
        <div className="rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 to-white px-3 py-2.5 text-xs text-zinc-700 shadow-sm space-y-1.5">
          <p className="font-semibold text-zinc-900 leading-snug">{slice.intentLabel}</p>
          <p className="text-zinc-600 leading-relaxed">{slice.expectedOutcome}</p>
          <p className="leading-relaxed text-zinc-800">{primaryMailReviewCountLine(slice)}</p>
          {trust ? <p className="text-zinc-600 leading-relaxed">{trust}</p> : null}
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 to-white px-3 py-2.5 text-xs text-zinc-700 shadow-sm space-y-1.5">
        <p>
          <span className="font-medium text-zinc-600">Intent:</span>{' '}
          <span className="text-zinc-900 font-semibold">{slice.intentLabel}</span>
        </p>
        <p>
          <span className="font-medium text-zinc-600">Scope:</span> {slice.scopeSummary}
        </p>
        <p>
          <span className="font-medium text-zinc-600">Count:</span> {countCompact}
        </p>
        <p className="leading-relaxed">
          <span className="font-medium text-zinc-600">Why:</span> {compactMailReviewWhyLine(slice)}
        </p>
        <details className="text-zinc-600 pt-0.5">
          <summary className="cursor-pointer font-medium text-sky-900">
            More: period, outcome, policy, operator query
          </summary>
          <div className="mt-2 space-y-2 pl-0.5 border-l border-sky-200/80 pl-3">
            <p>
              <span className="font-medium text-zinc-600">Period:</span> {slice.periodLabel}
            </p>
            <p className="text-zinc-600 leading-relaxed">{slice.expectedOutcome}</p>
            {policyBlock}
            {operatorQuery}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 to-white p-4 space-y-2 text-sm shadow-sm">
      <p className="font-semibold text-zinc-900 leading-snug">{slice.intentLabel}</p>
      <p className="text-xs text-zinc-700 leading-relaxed">
        <span className="font-medium text-zinc-800">Scope:</span> {slice.scopeSummary}
      </p>
      <p className="text-xs text-zinc-600">
        <span className="font-medium text-zinc-700">Period:</span> {slice.periodLabel}
      </p>
      <p className="text-xs text-zinc-600 leading-relaxed border-l-2 border-sky-200/80 pl-2">
        This view stays within the last 7 days so the task stays actionable and review-sized (not an unbounded inbox
        dump).
      </p>
      <p className="text-xs text-zinc-600 leading-relaxed">{slice.expectedOutcome}</p>
      {showDiagnosticsChrome ? policyBlock : null}
      {countLine}
      {operatorQuery}
    </div>
  );
}

function MailSearchRowList({
  rows,
  onSelectMessage,
}: {
  rows: MailSearchRow[];
  /** When omitted, rows render as static summaries (no drill-in). */
  onSelectMessage?: (messageId: string) => void;
}) {
  const interactive = typeof onSelectMessage === 'function';
  const rowClass =
    'w-full text-left rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 shadow-sm';
  const interactiveClass = interactive
    ? ' hover:border-sky-400/80 hover:bg-sky-50/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40'
    : ' opacity-95';

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.messageId}>
          {interactive ? (
            <button
              type="button"
              onClick={() => onSelectMessage!(row.messageId)}
              className={rowClass + interactiveClass}
            >
              <MailSearchRowBody row={row} />
            </button>
          ) : (
            <div className={rowClass + interactiveClass}>
              <MailSearchRowBody row={row} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function MailSearchRowBody({ row }: { row: MailSearchRow }) {
  return (
    <>
      <p className="font-medium text-zinc-900 text-sm line-clamp-2">{row.subject ?? '(No subject)'}</p>
      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{row.from ?? '—'}</p>
      {row.snippet ? (
        <p className="text-xs text-zinc-600 mt-1.5 line-clamp-2 leading-relaxed">{row.snippet}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2 text-[11px] text-zinc-400">
        {row.date ? <span>{row.date}</span> : null}
        {row.unread === true ? <span className="text-sky-800 font-medium">Unread</span> : null}
      </div>
    </>
  );
}

function WorkspaceMcpDataView({
  data,
  auditId,
  hasReviewSlice,
  omitRowList,
}: {
  data: unknown;
  auditId?: string;
  /** When true, raw text/JSON fallbacks are tucked under operator disclosure (POL-WS-UI). */
  hasReviewSlice?: boolean;
  /** Hide generic row list when a typed primary list (e.g. mail rows) is shown instead. */
  omitRowList?: boolean;
}) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const rows = extractMcpRowArray(data);
  const asString = typeof data === 'string' ? normalizeMcpText(data) : null;

  const rowList =
    !omitRowList && rows && rows.length > 0 ? (
      <ul className="space-y-2">
        {rows.slice(0, 80).map((row, i) => (
          <li
            key={i}
            className="rounded-xl border border-zinc-100 bg-white px-3 py-2.5 text-sm text-zinc-800 shadow-sm"
          >
            <span className="line-clamp-3 break-words">{summarizeMcpRow(row, i)}</span>
          </li>
        ))}
      </ul>
    ) : null;

  const rawTextBlock =
    asString !== null ? (
      hasReviewSlice ? (
        showDiagnosticsChrome ? (
          <details className="rounded-xl border border-zinc-200 bg-zinc-50/80 text-xs text-zinc-600">
            <summary className="cursor-pointer font-medium text-zinc-700 select-none px-3 py-2">
              Operator: raw text response
            </summary>
            <div className="px-3 pb-3 pt-0 text-sm text-zinc-800 whitespace-pre-wrap break-words max-h-80 overflow-y-auto leading-relaxed">
              {asString}
            </div>
          </details>
        ) : null
      ) : (
        <div className="rounded-xl border border-zinc-100 bg-white p-4 text-sm text-zinc-800 whitespace-pre-wrap break-words max-h-80 overflow-y-auto leading-relaxed shadow-sm">
          {asString}
        </div>
      )
    ) : null;

  const showGenericRowList = Boolean(!omitRowList && rows && rows.length > 0);
  const rawJsonBlock =
    showGenericRowList || asString !== null ? null : hasReviewSlice ? (
      showDiagnosticsChrome ? (
        <details className="text-xs bg-zinc-50/80 border border-zinc-200 rounded-xl overflow-hidden">
          <summary className="cursor-pointer font-medium text-zinc-600 select-none px-3 py-2">
            Operator: raw transport (JSON)
          </summary>
          <pre className="px-3 pb-3 overflow-x-auto max-h-64 text-zinc-800 border-t border-zinc-100 bg-white">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      ) : null
    ) : (
      <pre className="text-xs bg-white border border-zinc-100 rounded-xl p-3 overflow-x-auto max-h-64 shadow-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    );

  return (
    <div className="space-y-3">
      {rowList}
      {!rowList ? rawTextBlock : null}
      {!rowList && asString === null ? rawJsonBlock : null}
      {auditId && showDiagnosticsChrome ? (
        <details className="text-[11px] text-zinc-500">
          <summary className="cursor-pointer font-medium text-zinc-600 select-none">Audit reference</summary>
          <p className="mt-1 font-mono break-all">{auditId}</p>
        </details>
      ) : null}
    </div>
  );
}

function WorkspaceToolReadPanel({
  read,
  successTitle,
  successDescription,
}: {
  read: WorkspaceToolRead;
  successTitle: string;
  successDescription: string;
}) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();

  if (read.loadState === 'not_configured') {
    return <WorkspaceNotConfiguredCallout errorMessage={read.errorMessage} auditId={read.auditId} />;
  }
  if (read.loadState === 'error') {
    if (read.controlPlaneCode === 'auth_required') {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-bold">Google sign-in required</p>
          <p className="mt-1">{read.errorMessage ?? 'Sign in with Google first.'}</p>
          {read.auditId && showDiagnosticsChrome ? (
            <p className="mt-2 text-xs text-amber-800">Audit: {read.auditId}</p>
          ) : null}
        </div>
      );
    }
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
      >
        <p className="font-bold">Request failed</p>
        <p className="mt-1">{read.errorMessage ?? 'Unknown error'}</p>
        {showDiagnosticsChrome ? (
          <p className="mt-2 text-xs text-red-800">
            {read.controlPlaneCode ? `Control plane: ${read.controlPlaneCode}` : null}
            {read.adapterCode ? ` · Adapter: ${read.adapterCode}` : null}
          </p>
        ) : null}
        {read.auditId && showDiagnosticsChrome ? (
          <p className="mt-2 text-xs font-mono text-red-900/80">Audit: {read.auditId}</p>
        ) : null}
        <WorkspaceGoogleCloudApiDisabledHint message={read.errorMessage} />
        <WorkspaceMcpPseHint message={read.errorMessage} />
        <WorkspaceMcpOAuth21Hint message={read.errorMessage} controlPlaneCode={read.controlPlaneCode} />
      </div>
    );
  }
  if (read.loadState === 'empty') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900 mb-1">No results</p>
        <p>The server returned an empty list or blank text.</p>
        {read.auditId && showDiagnosticsChrome ? (
          <p className="mt-2 text-xs text-zinc-500">Audit: {read.auditId}</p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 text-sm text-zinc-800 space-y-2">
      <p className="font-semibold text-emerald-900">{successTitle}</p>
      <p className="text-xs text-zinc-600 leading-relaxed">{successDescription}</p>
      <WorkspaceMcpDataView data={read.data} auditId={read.auditId} />
    </div>
  );
}

/** Shown when MCP returns OAuth 2.1 / “no authenticated user” style errors. */
function WorkspaceMcpOAuth21Hint({
  message,
  controlPlaneCode,
}: {
  message?: string | null;
  controlPlaneCode?: string | null;
}) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();

  if (controlPlaneCode === 'auth_required') return null;
  if (!message || !/oauth|authenticated user|bearer|requires an authenticated/i.test(message)) return null;

  if (!showDiagnosticsChrome) {
    return (
      <div className="mt-3 text-xs text-red-900/90 leading-relaxed border-t border-red-200 pt-2">
        <p>
          <span className="font-semibold">Try this:</span> use <strong>Sign in with Google</strong> at the top of this
          panel, then try again. If it still fails, your sign-in may have expired—sign out and sign back in (sessions are
          short-lived).
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 text-xs text-red-900/90 leading-relaxed border-t border-red-200 pt-2 space-y-2">
      <p>
        <span className="font-semibold">What this means:</span> the hosted MCP could not attach a Google user to the
        tool call. The browser may have sent a token, but the server must validate it (userinfo) and set{' '}
        <span className="font-semibold">authenticated_user_email</span> in its auth middleware — or the{' '}
        <code className="text-[11px] bg-red-100/80 px-1 rounded">Authorization</code> header did not reach the process
        (reverse proxy).
      </p>
      <p>
        <span className="font-semibold">Fix:</span> use <strong>Sign in with Google</strong> at the top of this panel
        first (Google may show a consent/chooser popup). Then reopen Calendar or Mail, or use{' '}
        <strong>Refresh token</strong> if the session expired (~1h). Tokens live in memory for this tab only.
      </p>
      <p>
        <span className="font-semibold">Ops / hosted MCP:</span> ensure{' '}
        <code className="text-[11px] bg-red-100/80 px-1 rounded">EXTERNAL_OAUTH21_PROVIDER=true</code> so GIS-issued{' '}
        <code className="text-[11px] bg-red-100/80 px-1 rounded">ya29.*</code> tokens are validated via userinfo, and
        nginx forwards <code className="text-[11px] bg-red-100/80 px-1 rounded">Authorization</code> to upstream (see{' '}
        <code className="text-[11px] bg-red-100/80 px-1 rounded">docs/workspace-mcp-nginx-deploy.md</code>).
      </p>
      <p>
        <span className="font-semibold">Dev without GIS:</span> set{' '}
        <code className="text-[11px] bg-red-100/80 px-1 rounded">VITE_WORKSPACE_MCP_BEARER_TOKEN</code> in{' '}
        <code className="text-[11px] bg-red-100/80 px-1 rounded">.env.local</code> and restart{' '}
        <code className="text-[11px] bg-red-100/80 px-1 rounded">npm run dev</code> — short-lived; never commit.
        Use the same Google Cloud project / OAuth client the MCP trusts.
      </p>
    </div>
  );
}

/** Control plane `not_configured` covers missing MCP URL, missing Google email, or build without env — show both vars + server message. */
function WorkspaceNotConfiguredCallout({
  errorMessage,
  auditId,
}: {
  errorMessage?: string | null;
  auditId?: string | null;
}) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-bold flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Workspace MCP not ready
      </p>
      {showDiagnosticsChrome ? (
        <p className="mt-2 text-amber-900/90">
          Set <code className="text-xs bg-amber-100 px-1 rounded">VITE_WORKSPACE_MCP_URL</code> in{' '}
          <code className="text-xs bg-amber-100 px-1 rounded">.env.local</code> and restart{' '}
          <code className="text-xs bg-amber-100 px-1 rounded">npm run dev</code>. OAuth 2.1 MCP does not need a Google
          email in env for tool args (use <code className="text-xs bg-amber-100 px-1 rounded">Authorization: Bearer</code>{' '}
          when wired). Legacy single-user: <code className="text-xs bg-amber-100 px-1 rounded">VITE_WORKSPACE_MCP_INCLUDE_USER_EMAIL=true</code>{' '}
          plus <code className="text-xs bg-amber-100 px-1 rounded">VITE_AIOS_GOOGLE_USER_EMAIL</code>. If a shell var
          overrides <code className="text-xs bg-amber-100 px-1 rounded">.env</code>, see{' '}
          <code className="text-xs bg-amber-100 px-1 rounded">.env.example</code>.
        </p>
      ) : (
        <p className="mt-2 text-amber-900/90 leading-relaxed">
          Google Workspace tools are not connected in this build. Ask your administrator to configure the connection, or
          sign in with Google if the server is already set up.
        </p>
      )}
      {errorMessage && showDiagnosticsChrome ? (
        <p className="mt-2 text-xs font-mono text-amber-950/80 border-t border-amber-200/80 pt-2">{errorMessage}</p>
      ) : errorMessage && !showDiagnosticsChrome ? (
        <p className="mt-2 text-xs text-amber-900/90 border-t border-amber-200/80 pt-2 leading-relaxed">{errorMessage}</p>
      ) : null}
      {auditId && showDiagnosticsChrome ? <p className="mt-2 text-xs text-amber-800">Audit: {auditId}</p> : null}
    </div>
  );
}

function CalendarReadPanel({ read }: { read: WorkspaceCalendarRead }) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const calendars = useMemo(
    () => (read.loadState === 'ok' ? normalizeCalendarListFromMcpPayload(read.data) : []),
    [read.data, read.loadState],
  );

  const [selectedCalendarId, setSelectedCalendarId] = useState('primary');
  const [periodPreset, setPeriodPreset] = useState<CalendarPeriodPreset>('7d');

  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsAuditId, setEventsAuditId] = useState<string | null>(null);
  const [eventsRawText, setEventsRawText] = useState<string | null>(null);
  const [eventRows, setEventRows] = useState<{ summary: string; id: string }[]>([]);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailAuditId, setDetailAuditId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<unknown | null>(null);

  const [manualEventId, setManualEventId] = useState('');

  useEffect(() => {
    if (calendars.length === 0) return;
    const stillValid = calendars.some((c) => c.id === selectedCalendarId);
    if (!stillValid) {
      setSelectedCalendarId(calendars[0].id);
    }
  }, [calendars, selectedCalendarId]);

  const loadEventsForWindow = async () => {
    const tr = computeCalendarPeriodRange(periodPreset);
    const calId = selectedCalendarId.trim() || 'primary';
    setEventsLoading(true);
    setEventsError(null);
    setEventsRawText(null);
    setEventRows([]);
    setDetailData(null);
    setDetailError(null);
    try {
      const execution_scope = buildCalendarEventsListScope(calId, tr.time_min, tr.time_max);
      const result = await runWorkspaceControlPlane(
        {
          intent: 'workspace.calendar.events.list',
          actor_type: 'founder',
          tenant_id: 'local',
          user_binding: 'browser',
          execution_mode: 'execute',
          policy_context: { scope_class: 'workspace.google.read' },
          resource_ref: { type: 'calendar', id: calId },
          calendar_time_range: tr,
          execution_scope,
        },
        { surfaceMode: 'founder' },
      );
      setEventsAuditId(result.auditId);
      if (result.ok === false) {
        setEventsError(result.message);
        return;
      }
      const text = normalizeMcpText(result.data);
      setEventsRawText(text);
      setEventRows(parseCalendarEventRowsFromGetEventsText(text));
    } catch (e) {
      setEventsError(e instanceof Error ? e.message : String(e));
    } finally {
      setEventsLoading(false);
    }
  };

  const loadEventDetail = async (eventId: string) => {
    const calId = selectedCalendarId.trim() || 'primary';
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    setDetailAuditId(null);
    try {
      const execution_scope = buildCalendarGetScope(eventId, calId);
      const result = await runWorkspaceControlPlane(
        {
          intent: 'workspace.calendar.get',
          actor_type: 'founder',
          tenant_id: 'local',
          user_binding: 'browser',
          execution_mode: 'execute',
          policy_context: { scope_class: 'workspace.google.read' },
          resource_ref: { type: 'calendar_event', id: eventId, calendarId: calId },
          execution_scope,
        },
        { surfaceMode: 'founder' },
      );
      setDetailAuditId(result.auditId);
      if (result.ok === false) {
        setDetailError(result.message);
        return;
      }
      setDetailData(result.data);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const loadManualEventId = () => {
    const id = manualEventId.trim();
    if (!id) {
      setDetailError('Enter an event id.');
      return;
    }
    void loadEventDetail(id);
  };

  if (read.loadState === 'not_configured') {
    return <WorkspaceNotConfiguredCallout errorMessage={read.errorMessage} auditId={read.auditId} />;
  }

  if (read.loadState === 'error') {
    if (read.controlPlaneCode === 'auth_required') {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-bold">Google sign-in required</p>
          <p className="mt-1">{read.errorMessage ?? 'Sign in with Google first, then reload Calendar.'}</p>
          {read.auditId && showDiagnosticsChrome ? (
            <p className="mt-2 text-xs text-amber-800">Audit: {read.auditId}</p>
          ) : null}
        </div>
      );
    }
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
      >
        <p className="font-bold">Calendar read failed</p>
        <p className="mt-1">{read.errorMessage ?? 'Unknown error'}</p>
        {showDiagnosticsChrome ? (
          <p className="mt-2 text-xs text-red-800">
            {read.controlPlaneCode ? `Control plane: ${read.controlPlaneCode}` : null}
            {read.adapterCode ? ` · Adapter: ${read.adapterCode}` : null}
          </p>
        ) : null}
        {read.auditId && showDiagnosticsChrome ? (
          <p className="mt-2 text-xs font-mono text-red-900/80">Audit: {read.auditId}</p>
        ) : null}
        <WorkspaceMcpOAuth21Hint message={read.errorMessage} controlPlaneCode={read.controlPlaneCode} />
      </div>
    );
  }

  if (read.loadState === 'empty') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900 mb-1">No calendars (empty)</p>
        <p>The MCP adapter returned an empty list. This is distinct from a load failure.</p>
        {read.auditId && showDiagnosticsChrome ? (
          <p className="mt-2 text-xs text-zinc-500">Audit: {read.auditId}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 text-sm text-zinc-800 space-y-3">
      <div>
        <p className="font-semibold text-emerald-900">Calendars</p>
        <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
          Accounts and calendars you can access (read-only).
        </p>
      </div>
      <WorkspaceMcpDataView data={read.data} auditId={read.auditId} />

      <div className="border-t border-emerald-200/60 pt-3 space-y-3">
        <div>
          <p className="text-xs font-medium text-emerald-900">Events in a bounded window</p>
          {showDiagnosticsChrome ? (
            <p className="text-[11px] text-zinc-600 leading-relaxed mt-0.5">
              Intent <span className="font-mono">workspace.calendar.events.list</span> → MCP{' '}
              <span className="font-mono">get_events</span> with <span className="font-mono">time_min</span> /{' '}
              <span className="font-mono">time_max</span>. Pick a calendar and period, then load. Click an event for
              details (<span className="font-mono">workspace.calendar.get</span>, same calendar).
            </p>
          ) : (
            <p className="text-[11px] text-zinc-600 leading-relaxed mt-0.5">
              Choose a calendar and time range, then load events. Tap an event to see details.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex flex-col gap-0.5 text-[11px] text-zinc-600">
            <span>Calendar</span>
            <select
              value={selectedCalendarId}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="min-w-[14rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900"
            >
              <option value="primary">Primary</option>
              {calendars
                .filter((c) => c.id !== 'primary')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary.length > 48 ? `${c.summary.slice(0, 48)}…` : c.summary}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-[11px] text-zinc-600">
            <span>Period</span>
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as CalendarPeriodPreset)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900"
            >
              <option value="today">Today</option>
              <option value="7d">Next 7 days</option>
              <option value="30d">Next 30 days</option>
            </select>
          </label>
          <button
            type="button"
            disabled={eventsLoading}
            onClick={() => void loadEventsForWindow()}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {eventsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Load events
          </button>
        </div>

        {eventsError ? (
          <p className="text-xs text-red-800" role="alert">
            {eventsError}
            {eventsAuditId && showDiagnosticsChrome ? (
              <span className="block mt-1 font-mono text-red-900/80">Audit: {eventsAuditId}</span>
            ) : null}
          </p>
        ) : null}

        {eventRows.length > 0 ? (
          <ul className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2">
            {eventRows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={detailLoading}
                  onClick={() => void loadEventDetail(row.id)}
                  className="w-full text-left rounded-md px-2 py-1.5 text-xs text-zinc-800 hover:bg-emerald-50 border border-transparent hover:border-emerald-200"
                >
                  <span className="font-medium text-zinc-900">{row.summary}</span>
                  {showDiagnosticsChrome ? (
                    <span className="block font-mono text-[10px] text-zinc-500 truncate">{row.id}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {eventsRawText != null && eventRows.length === 0 && showDiagnosticsChrome ? (
          <pre className="text-[11px] bg-white border border-zinc-200 rounded-lg p-2 max-h-48 overflow-auto whitespace-pre-wrap text-zinc-700">
            {eventsRawText}
          </pre>
        ) : null}
        {eventsRawText != null && eventRows.length === 0 && !showDiagnosticsChrome ? (
          <p className="text-[11px] text-zinc-600">We could not turn this response into a simple event list.</p>
        ) : null}

        {detailError ? (
          <p className="text-xs text-red-800" role="alert">
            {detailError}
            {detailAuditId && showDiagnosticsChrome ? (
              <span className="block mt-1 font-mono text-red-900/80">Audit: {detailAuditId}</span>
            ) : null}
          </p>
        ) : null}
        {detailData != null ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-2">
            <p className="text-[11px] font-medium text-zinc-700 mb-1">Event detail</p>
            <WorkspaceMcpDataView data={detailData} auditId={detailAuditId ?? undefined} />
          </div>
        ) : null}
        {detailLoading ? (
          <p className="text-[11px] text-zinc-500 flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading event…
          </p>
        ) : null}

        {showDiagnosticsChrome ? (
          <details className="text-[11px] text-zinc-600">
            <summary className="cursor-pointer font-medium text-zinc-700">Advanced: paste event id</summary>
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={manualEventId}
                onChange={(e) => setManualEventId(e.target.value)}
                placeholder="Event id"
                className="min-w-[12rem] flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-mono text-zinc-900"
                aria-label="Calendar event id (manual)"
              />
              <button
                type="button"
                disabled={detailLoading}
                onClick={() => loadManualEventId()}
                className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-600 disabled:opacity-50"
              >
                Load
              </button>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function MailSearchPanel({
  read,
  onPickMessageId,
}: {
  read: WorkspaceMailSearch;
  onPickMessageId?: (messageId: string) => void;
}) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const mr = read.mailReviewSlice;
  const hasReviewSlice = Boolean(mr);

  if (read.loadState === 'not_configured') {
    return (
      <div className="space-y-3">
        {mr ? <MailReviewOutcomeCard slice={mr} /> : null}
        <WorkspaceNotConfiguredCallout errorMessage={read.errorMessage} auditId={read.auditId} />
      </div>
    );
  }

  if (read.loadState === 'error') {
    if (read.controlPlaneCode === 'auth_required') {
      return (
        <div className="space-y-3">
          {mr ? <MailReviewOutcomeCard slice={mr} /> : null}
          <div
            role="alert"
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-bold">Google sign-in required</p>
            <p className="mt-1">{read.errorMessage ?? 'Sign in with Google first, then reload Mail.'}</p>
            {read.auditId && showDiagnosticsChrome ? (
              <p className="mt-2 text-xs text-amber-800">Audit: {read.auditId}</p>
            ) : null}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {mr ? <MailReviewOutcomeCard slice={mr} /> : null}
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
        >
          <p className="font-bold">Mail search failed</p>
          <p className="mt-1">{read.errorMessage ?? 'Unknown error'}</p>
          {showDiagnosticsChrome ? (
            <p className="mt-2 text-xs text-red-800">
              {read.controlPlaneCode ? `Control plane: ${read.controlPlaneCode}` : null}
              {read.adapterCode ? ` · Adapter: ${read.adapterCode}` : null}
            </p>
          ) : null}
          {read.auditId && showDiagnosticsChrome ? (
            <p className="mt-2 text-xs font-mono text-red-900/80">Audit: {read.auditId}</p>
          ) : null}
          <WorkspaceMcpOAuth21Hint message={read.errorMessage} controlPlaneCode={read.controlPlaneCode} />
        </div>
      </div>
    );
  }

  if (read.loadState === 'empty') {
    return (
      <div className="space-y-3">
        {mr ? <MailReviewOutcomeCard slice={mr} /> : null}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
          <p className="font-semibold text-zinc-900 mb-1">No messages (empty)</p>
          <p>
            {hasReviewSlice
              ? 'No unread messages matched this scope in the last 7 days (or the adapter returned an empty list).'
              : 'The MCP adapter returned an empty result. This is distinct from a load failure.'}
          </p>
          {read.auditId && showDiagnosticsChrome ? (
            <p className="mt-2 text-xs text-zinc-500">Audit: {read.auditId}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const quickIds =
    typeof read.data === 'string' ? extractGmailMessageIdsFromSearchText(read.data) : [];

  const normalizedRows = normalizeMailSearchRows(read.data);
  const structuredPrimary =
    hasReviewSlice && mailSearchRowsHaveClickTargets(normalizedRows) && normalizedRows.length > 0;

  return (
    <div className="space-y-3">
      {mr ? <MailReviewOutcomeCard slice={mr} /> : null}
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 text-sm text-zinc-800 space-y-3">
        <div>
          <p className="font-semibold text-emerald-900">
            {hasReviewSlice ? 'Messages in scope' : 'Inbox search'}
          </p>
          <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
            {hasReviewSlice
              ? structuredPrimary
                ? showDiagnosticsChrome
                  ? 'Select a message to open it. Raw transport stays under Operator.'
                  : 'Select a message to open it.'
                : showDiagnosticsChrome
                  ? 'Structured rows were not detected; showing generic summary. Use Advanced to paste an id if needed.'
                  : 'We could not show a formatted list. Try another search or open a message another way.'
              : showDiagnosticsChrome
                ? 'Recent messages (default query). Tap an id below to load the full message.'
                : 'Recent messages from your search. Tap a result to open it.'}
          </p>
        </div>
        {structuredPrimary ? (
          <MailSearchRowList rows={normalizedRows} onSelectMessage={onPickMessageId} />
        ) : null}
        <WorkspaceMcpDataView
          data={read.data}
          auditId={read.auditId}
          hasReviewSlice={hasReviewSlice}
          omitRowList={structuredPrimary}
        />
        {!structuredPrimary && quickIds.length > 0 && onPickMessageId && showDiagnosticsChrome ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {quickIds.slice(0, 12).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onPickMessageId(id)}
                className="text-xs font-mono rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sky-900 hover:bg-sky-50 break-all max-w-full"
                title="Load this message"
              >
                {id.length > 28 ? `${id.slice(0, 14)}…${id.slice(-8)}` : id}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MailMailModePanels({
  mailSearch,
  mailRead,
  openMailMessageId,
  onReadMail,
  onClearMailRead,
}: {
  mailSearch: WorkspaceMailSearch;
  mailRead?: WorkspaceMailRead;
  openMailMessageId?: string;
  onReadMail?: (messageId: string) => void;
  onClearMailRead?: () => void;
}) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const [draftId, setDraftId] = useState('');

  return (
    <div className="space-y-4">
      {mailRead ? (
        <div className="space-y-3">
          {mailSearch.mailReviewSlice ? (
            <MailReviewOutcomeCard slice={mailSearch.mailReviewSlice} variant="compact" />
          ) : null}
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
          {mailRead.loadState === 'ok' ? (
            <MailMessageActionsPanel mailRead={mailRead} openMailMessageId={openMailMessageId} />
          ) : null}
        </div>
      ) : null}

      <div className={mailRead ? 'rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3' : ''}>
        {!mailRead ? (
          <MailSearchPanel read={mailSearch} onPickMessageId={onReadMail} />
        ) : (
          <details className="text-sm text-zinc-600">
            <summary className="cursor-pointer font-medium text-zinc-800">Search results</summary>
            <div className="mt-2 max-h-56 overflow-auto">
              <MailSearchPanel read={mailSearch} onPickMessageId={onReadMail} />
            </div>
          </details>
        )}
      </div>

      {!mailRead && onReadMail ? (
        mailSearch.mailReviewSlice ? (
          showDiagnosticsChrome ? (
            <details className="rounded-2xl border border-zinc-200 bg-zinc-50/60 text-sm text-zinc-700">
              <summary className="cursor-pointer font-medium text-zinc-800 px-4 py-3 select-none">
                Advanced: paste message id
              </summary>
              <div className="px-4 pb-4 pt-0 space-y-2 border-t border-zinc-100">
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Prefer shortcuts from the list above. Paste a Gmail message id only if you already have it.
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
                    className="shrink-0 rounded-xl bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-40"
                  >
                    Load message
                  </button>
                </div>
              </div>
            </details>
          ) : null
        ) : showDiagnosticsChrome ? (
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 space-y-2">
            <p className="text-sm font-medium text-zinc-900">Read one message</p>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Paste a Gmail message id, or use a shortcut from the search results above.
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
        ) : null
      ) : null}
    </div>
  );
}

function MailReadPanel({ read }: { read: WorkspaceMailRead }) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();

  if (read.loadState === 'not_configured') {
    return <WorkspaceNotConfiguredCallout errorMessage={read.errorMessage} auditId={read.auditId} />;
  }

  if (read.loadState === 'error') {
    if (read.controlPlaneCode === 'auth_required') {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-bold">Google sign-in required</p>
          <p className="mt-1">{read.errorMessage ?? 'Sign in with Google first, then load the message again.'}</p>
          {read.auditId && showDiagnosticsChrome ? (
            <p className="mt-2 text-xs text-amber-800">Audit: {read.auditId}</p>
          ) : null}
        </div>
      );
    }
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
      >
        <p className="font-bold">Message read failed</p>
        <p className="mt-1">{read.errorMessage ?? 'Unknown error'}</p>
        {showDiagnosticsChrome ? (
          <p className="mt-2 text-xs text-red-800">
            {read.controlPlaneCode ? `Control plane: ${read.controlPlaneCode}` : null}
            {read.adapterCode ? ` · Adapter: ${read.adapterCode}` : null}
          </p>
        ) : null}
        {read.auditId && showDiagnosticsChrome ? (
          <p className="mt-2 text-xs font-mono text-red-900/80">Audit: {read.auditId}</p>
        ) : null}
        <WorkspaceMcpOAuth21Hint message={read.errorMessage} controlPlaneCode={read.controlPlaneCode} />
      </div>
    );
  }

  if (read.loadState === 'empty') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900 mb-1">Empty message payload</p>
        <p>Adapter returned success but no readable body was detected (heuristic).</p>
        {read.auditId && showDiagnosticsChrome ? (
          <p className="mt-2 text-xs text-zinc-500">Audit: {read.auditId}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-violet-50/40 p-4 text-sm text-zinc-800 space-y-3">
      <div>
        <p className="font-semibold text-violet-900">Message</p>
        <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">Headers and body as returned by the server.</p>
      </div>
      <WorkspaceMcpDataView data={read.data} auditId={read.auditId} />
    </div>
  );
}
