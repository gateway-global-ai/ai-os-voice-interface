/**
 * ThreadSummaryV1 — stable interpretation artifact for mail thread summarize (Milestone B).
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** Set on traces and success payloads when `threadSummaryV1` is present — forward-compatible schema tag. */
export const THREAD_SUMMARY_SCHEMA_ID = 'thread_summary_v1' as const;
export type ThreadSummarySchemaId = typeof THREAD_SUMMARY_SCHEMA_ID;

export type ThreadSummaryV1 = {
  summary: string;
  requestedAction: string | null;
  openQuestions: string[];
  datesCommitments: string[];
  suggestedNextStep: string | null;
};

export function emptyThreadSummaryV1(): ThreadSummaryV1 {
  return {
    summary: '',
    requestedAction: null,
    openQuestions: [],
    datesCommitments: [],
    suggestedNextStep: null,
  };
}

function coerceStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? '').trim()).filter(Boolean);
}

function coerceNullableString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/**
 * Accepts parsed JSON and coerces into ThreadSummaryV1. Fails only if root is not a non-null object.
 */
export function normalizeThreadSummaryV1(input: unknown): { ok: true; value: ThreadSummaryV1 } | { ok: false; reason: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, reason: 'Root must be a JSON object' };
  }
  const o = input as Record<string, unknown>;
  const summaryRaw = o.summary;
  const summary =
    typeof summaryRaw === 'string'
      ? summaryRaw.trim()
      : summaryRaw === null || summaryRaw === undefined
        ? ''
        : String(summaryRaw).trim();

  return {
    ok: true,
    value: {
      summary,
      requestedAction: coerceNullableString(o.requestedAction),
      openQuestions: coerceStringArray(o.openQuestions),
      datesCommitments: coerceStringArray(o.datesCommitments),
      suggestedNextStep: coerceNullableString(o.suggestedNextStep),
    },
  };
}

/** Pull JSON object text from model output (plain JSON, fenced ```json, or leading prose). */
export function extractJsonObjectText(s: string): string | null {
  const t = s.trim();
  if (t.startsWith('```')) {
    const m = t.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n```/i);
    if (m?.[1]) return m[1].trim();
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return null;
}

export type ParseThreadSummaryV1Result =
  | { ok: true; value: ThreadSummaryV1 }
  | { ok: false; reason: string };

/**
 * Parse local LLM response into ThreadSummaryV1. On failure, callers should surface `interpretation_invalid`.
 */
export function parseThreadSummaryV1FromLlm(text: string): ParseThreadSummaryV1Result {
  const candidate = extractJsonObjectText(text) ?? text.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return { ok: false, reason: 'JSON parse failed' };
  }
  return normalizeThreadSummaryV1(parsed);
}
