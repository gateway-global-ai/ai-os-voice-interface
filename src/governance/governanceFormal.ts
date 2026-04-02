/**
 * Formal governing documents use canonical AIOS IDs from DOCUMENT_REGISTRY.json.
 * Reference notes, drafts without IDs, and placeholder "—" rows are excluded from planning.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { DocumentListItem } from './canvasBridge';

/** Ratified / draft commercial entries in the registry (e.g. AIOS-CORE-001, AIOS-SPEC-002). */
export function isFormalGovernanceDocumentId(documentId: string): boolean {
  return /^AIOS-[A-Z]+-\d{3}$/.test(documentId.trim());
}

/**
 * Keep only formal registry entries, preserving the order returned by the API
 * (same order as DOCUMENT_REGISTRY.json).
 */
export function formalGovernanceDocumentsInRegistryOrder(
  documents: DocumentListItem[]
): DocumentListItem[] {
  return documents.filter((d) => isFormalGovernanceDocumentId(d.document_id));
}
