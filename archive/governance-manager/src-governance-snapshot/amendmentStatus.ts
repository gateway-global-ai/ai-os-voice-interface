/**
 * Normalizes amendment workflow run status strings into stable buckets for the hub.
 * Unknown or novel API values must never be silently treated as "in progress" or "completed".
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type AmendmentStatusBucket = 'in_progress' | 'completed' | 'unknown';

/**
 * Map a server `status` string to a workspace bucket. Uses explicit word boundaries
 * where possible; anything unrecognized goes to `unknown`.
 */
export function classifyAmendmentRunStatus(status: string): AmendmentStatusBucket {
  const s = status.trim().toLowerCase();
  if (!s) return 'unknown';

  // Terminal / success outcomes
  if (
    /\b(complete|completed|done|closed|merged|archived|published|ratified)\b/.test(s) ||
    (/\bcomplete\b/.test(s) && !/\bincomplete\b/.test(s))
  ) {
    return 'completed';
  }

  // Failed / cancelled — must run before in-progress patterns that match substrings like "review"
  // (e.g. "failed review", "review cancelled" must not become in_progress).
  if (/\b(fail|failed|failure|error|cancel|cancelled|canceled|abort|aborted|rejected)\b/.test(s)) {
    return 'unknown';
  }

  // Active pipeline (explicit — do not guess from vague words)
  if (
    /\b(active|running|pending|in_progress|in progress|queued|waiting|executing|processing)\b/.test(s) ||
    /\b(draft|proposed|proposal)\b/.test(s) ||
    /\b(peer|review|reviewing|planning|synthesis)\b/.test(s)
  ) {
    return 'in_progress';
  }

  return 'unknown';
}
