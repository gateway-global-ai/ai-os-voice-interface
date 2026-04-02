/**
 * Heuristics for founder Review Docs pinned entries (README, Introduction).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { DocumentListItem } from './canvasBridge';

function textOf(d: DocumentListItem): string {
  return `${d.title} ${d.path}`.toLowerCase();
}

export function pickReadmeDocument(documents: DocumentListItem[]): DocumentListItem | null {
  return (
    documents.find((d) => /\breadme\b/.test(textOf(d))) ??
    documents.find((d) => textOf(d).includes('readme.md')) ??
    null
  );
}

export function pickIntroductionDocument(documents: DocumentListItem[]): DocumentListItem | null {
  return (
    documents.find((d) => /\bintroduction\b/.test(textOf(d))) ??
    documents.find((d) => textOf(d).includes('introduction.md')) ??
    null
  );
}

export function pickReviewPinnedDocuments(documents: DocumentListItem[]): DocumentListItem[] {
  const readme = pickReadmeDocument(documents);
  const intro = pickIntroductionDocument(documents);
  const out: DocumentListItem[] = [];
  if (readme) out.push(readme);
  if (intro && intro.document_id !== readme?.document_id) out.push(intro);
  return out;
}
