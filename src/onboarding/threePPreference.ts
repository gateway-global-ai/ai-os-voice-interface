/**
 * 3P Focus Mode preference — persisted to localStorage.
 * Purpose / Plan / Pressure monitoring toggle.
 * @license SPDX-License-Identifier: Apache-2.0
 */

const LS_KEY = 'aios_3p_enabled';

/** Returns true if 3P Focus Mode is enabled. Defaults to true for new users. */
export function is3PEnabled(): boolean {
  const stored = localStorage.getItem(LS_KEY);
  if (stored === null) return true; // on by default
  return stored === 'true';
}

/** Enable or disable 3P Focus Mode. */
export function set3PEnabled(enabled: boolean): void {
  localStorage.setItem(LS_KEY, String(enabled));
}

/** Toggle and return new state. */
export function toggle3P(): boolean {
  const next = !is3PEnabled();
  set3PEnabled(next);
  return next;
}
