/**
 * Shell session entry classification — **AMD-2026-012 §5** (new vs returning).
 * **Core** module — no React (AIOS-ADR-001). Uses browser storage when `window` exists.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

const ENTRY_VISITED_KEY = 'aios.shell.entry.visited';

export type SessionEntryClassification = 'new' | 'returning';

/**
 * **Returning** if this browser profile has previously engaged the Shell; **new** otherwise.
 */
export function readSessionEntryClassification(): SessionEntryClassification {
  if (typeof window === 'undefined') return 'returning';
  try {
    return localStorage.getItem(ENTRY_VISITED_KEY) === '1' ? 'returning' : 'new';
  } catch {
    return 'new';
  }
}

/** Persist “returning” for future visits and drive continuity-oriented copy in-session. */
export function markSessionEntryEngaged(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ENTRY_VISITED_KEY, '1');
  } catch {
    /* */
  }
}
