/**
 * Full-text document search orchestration (bridge I/O only — call from GovernanceCanvasProvider).
 *
 * **Scope rule:** search is **list-scoped** only. It runs against the current `document_list` registry
 * snapshot in memory, not a separate global navigation mode. Broadening to global corpus search is a
 * deliberate product change.
 *
 * **Projection:** A multi-hit result is a temporary **search projection** over the base list (matches
 * first, then remainder), not merely a reorder — it leaves room for facets, saved searches, and scoped
 * modes later.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { searchDocuments, type DocumentListItem } from './canvasBridge';

export type GovernanceSearchPhase = 'idle' | 'loading' | 'success' | 'error';

export type DocumentSearchOutcome =
  | { kind: 'navigate'; documentId: string }
  /** Temporary projected ordering / result set over the registry (matches first, then rest). */
  | { kind: 'projection'; documents: DocumentListItem[] }
  | { kind: 'no_hits' };

export async function executeDocumentFullTextSearch(
  rawQuery: string,
  registry: DocumentListItem[],
  signal?: AbortSignal
): Promise<DocumentSearchOutcome> {
  const query = rawQuery.trim();
  if (!query) {
    throw new Error('empty_query');
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const results = await searchDocuments(query);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const ids = new Set(
    results.map((r) => String((r as { document_id?: string }).document_id || '')).filter(Boolean)
  );
  if (ids.size === 0) {
    return { kind: 'no_hits' };
  }

  const matched = registry.filter((d) => ids.has(d.document_id));
  if (matched.length === 1 && matched[0].document_id) {
    return { kind: 'navigate', documentId: matched[0].document_id };
  }
  if (matched.length > 0) {
    const rest = registry.filter((d) => !ids.has(d.document_id));
    return { kind: 'projection', documents: [...matched, ...rest] };
  }

  return { kind: 'no_hits' };
}
