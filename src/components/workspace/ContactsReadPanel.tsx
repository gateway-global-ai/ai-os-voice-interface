/**
 * Structured contacts list + pagination for MCP `list_contacts` output.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { GovernanceWorkspaceToolRead } from '../../governance/loadGovernancePayload';
import { runWorkspaceControlPlane } from '../../workspace/integrationControlPlane';
import { parseContactsListMcpText, type ParsedContactRow } from '../../workspace/contactsMcpParse';
import { normalizeMcpText } from '../../workspace/workspaceMcpDisplay';

type Props = {
  read: GovernanceWorkspaceToolRead;
};

export function ContactsReadPanel({ read }: Props) {
  const [contacts, setContacts] = useState<ParsedContactRow[]>([]);
  const [summaryLine, setSummaryLine] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const seed = useMemo(() => parseContactsListMcpText(normalizeMcpText(read.data)), [read.data]);

  useEffect(() => {
    setContacts(seed.contacts);
    setSummaryLine(seed.summaryLine);
    setNextToken(seed.nextPageToken);
    setPageError(null);
  }, [read.auditId, seed]);

  const loadMore = useCallback(async () => {
    const token = nextToken?.trim();
    if (!token) return;
    setLoadingMore(true);
    setPageError(null);
    try {
      const result = await runWorkspaceControlPlane(
        {
          intent: 'workspace.contacts.list',
          actor_type: 'founder',
          tenant_id: 'local',
          user_binding: 'browser',
          execution_mode: 'execute',
          policy_context: { scope_class: 'workspace.google.identity' },
          contacts_page_token: token,
        },
        { surfaceMode: 'founder' },
      );
      if (result.ok === false) {
        setPageError(result.message);
        return;
      }
      const p = parseContactsListMcpText(normalizeMcpText(result.data));
      setContacts((prev) => {
        const seen = new Set(prev.map((x) => x.contactId));
        const merged = [...prev];
        for (const c of p.contacts) {
          if (!seen.has(c.contactId)) {
            seen.add(c.contactId);
            merged.push(c);
          }
        }
        return merged;
      });
      setNextToken(p.nextPageToken);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  }, [nextToken]);

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 text-sm text-zinc-800 space-y-3">
      <div>
        <p className="font-semibold text-emerald-900">Contacts</p>
        {summaryLine ? (
          <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{summaryLine}</p>
        ) : (
          <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
            Loaded via <span className="font-mono">workspace.contacts.list</span> (People API connections).
          </p>
        )}
      </div>

      {contacts.length > 0 ? (
        <ul className="space-y-2 max-h-[min(28rem,60vh)] overflow-y-auto pr-1">
          {contacts.map((c) => (
            <li key={c.contactId} className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-xs shadow-sm">
              <p className="font-medium text-zinc-900">{c.name?.trim() || '—'}</p>
              <p className="font-mono text-[10px] text-zinc-500 mt-0.5 break-all">ID: {c.contactId}</p>
              {c.email ? (
                <p className="text-zinc-700 mt-1">
                  <span className="text-zinc-500">Email:</span> {c.email}
                </p>
              ) : null}
              {c.phone ? (
                <p className="text-zinc-700">
                  <span className="text-zinc-500">Phone:</span> {c.phone}
                </p>
              ) : null}
              {c.organization ? (
                <p className="text-zinc-600 mt-0.5">
                  <span className="text-zinc-500">Org:</span> {c.organization}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-600">No contact rows parsed from the response; raw payload below.</p>
      )}

      {nextToken ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Load more
          </button>
          <span className="text-[11px] text-zinc-500">More contacts available (paged).</span>
        </div>
      ) : null}

      {pageError ? (
        <p className="text-xs text-red-800" role="alert">
          {pageError}
        </p>
      ) : null}

      <details className="text-xs text-zinc-500">
        <summary className="cursor-pointer font-medium text-zinc-600 select-none">Operator: raw MCP text</summary>
        <pre className="mt-2 rounded-lg border border-zinc-200 bg-white p-2 max-h-48 overflow-auto text-[11px] text-zinc-700 whitespace-pre-wrap break-words font-mono">
          {normalizeMcpText(read.data)}
        </pre>
      </details>

      {read.auditId ? <p className="text-[11px] text-zinc-500">Initial load audit: {read.auditId}</p> : null}
    </div>
  );
}
