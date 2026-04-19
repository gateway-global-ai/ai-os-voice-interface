/**
 * Admin-editable overrides for lesson/task narration text.
 * Overrides are stored in localStorage and take precedence over the defaults in lessons.ts.
 * @license SPDX-License-Identifier: Apache-2.0
 */

const LS_KEY = 'aios_narration_overrides';

export function readNarrationOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Returns the admin override if one exists, otherwise the default text from lessons.ts. */
export function getNarration(id: string, defaultText: string): string {
  return readNarrationOverrides()[id] ?? defaultText;
}

/** Save an override for a lesson/task narration. Pass empty string to clear the override. */
export function writeNarrationOverride(id: string, text: string): void {
  const overrides = readNarrationOverrides();
  const trimmed = text.trim();
  if (trimmed) {
    overrides[id] = trimmed;
  } else {
    delete overrides[id];
  }
  localStorage.setItem(LS_KEY, JSON.stringify(overrides));
}

/** Clear all narration overrides (restore defaults). */
export function clearAllNarrationOverrides(): void {
  localStorage.removeItem(LS_KEY);
}
