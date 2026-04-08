/**
 * Order numbers from `governing_docs/introduction.md` — "Complete Document Set – Titles & Descriptions".
 * Used for Planning Assistant: sort and display the same 1–12 labels as the introduction table.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { DocumentListItem } from './canvasBridge';

/**
 * Maps formal document_id → introduction table # (1–12).
 * Multiple registry files can share one intro row (e.g. NodeContract + PolicyRecord → 5).
 */
const INTRODUCTION_TABLE_NUMBER: Record<string, number> = {
  'AIOS-CORE-001': 1, // AIOS Technical Manifesto
  'AIOS-CORE-002': 2, // AIOS Governance Constitution
  'AIOS-CORE-003': 3, // Master Platform Operating Agreement (MPOA)
  'AIOS-COMM-001': 4, // Marketplace Terms & Vendor Onboarding
  'AIOS-SPEC-001': 5, // NodeContract (part of "NodeContract & Policy Specification")
  'AIOS-SPEC-002': 5, // PolicyRecord
  'AIOS-SPEC-006': 6, // UI Component Registry Standard
  'AIOS-SPEC-004': 7, // CLI Developer Experience Guide
  'AIOS-SPEC-003': 8, // Agent Integration Protocol (AIP)
  'AIOS-SPEC-005': 8, // Agent Integration Guide (implements / complements AIP)
  'AIOS-SPEC-009': 9, // Security & Sandboxing Model
  'AIOS-COMM-002': 10, // Data Privacy & Compliance Addendum
  'AIOS-REF-011': 11, // Governance Council Operating Manual
  'AIOS-REF-012': 12, // Ecosystem Roadmap & Versioning Policy
};

export function getIntroductionTableNumber(documentId: string): number | null {
  const n = INTRODUCTION_TABLE_NUMBER[documentId.trim()];
  return n !== undefined ? n : null;
}

export type PlanningDocumentItem = DocumentListItem & {
  introductionNumber: number | null;
};

export function attachIntroductionNumbers(
  documents: DocumentListItem[]
): PlanningDocumentItem[] {
  return documents.map((d) => ({
    ...d,
    introductionNumber: getIntroductionTableNumber(d.document_id),
  }));
}

/** Same sequence as the introduction document table; unknown IDs last (by document_id). */
export function sortFormalDocumentsByIntroductionTable(
  documents: DocumentListItem[]
): DocumentListItem[] {
  return [...documents].sort((a, b) => {
    const na = getIntroductionTableNumber(a.document_id);
    const nb = getIntroductionTableNumber(b.document_id);
    const orderA = na ?? 100;
    const orderB = nb ?? 100;
    if (orderA !== orderB) return orderA - orderB;
    return a.document_id.localeCompare(b.document_id);
  });
}
