/**
 * Legacy bootstrap keys for diagnostics (POL-SHELL-006 engineering paths).
 * Primary default surface mode is resolved in `shellBootstrap` + `ShellStateContext`.
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** Legacy keys — device-local hints only (not identity). Exported for interim shell authority. */
export const LEGACY_SHELL_DIAG_KEY = 'aios.shell.diagnostics';
export const LEGACY_SHELL_OP_KEY = 'aios.shell.operator';

const STORAGE_DIAG = LEGACY_SHELL_DIAG_KEY;
const STORAGE_OP = LEGACY_SHELL_OP_KEY;

/**
 * Persist URL flags so in-app navigation keeps diagnostics without the query string.
 */
export function persistDiagnosticsChromeFlagsFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('aios_dev') === '1') {
      sessionStorage.setItem(STORAGE_DIAG, '1');
    }
    if (q.get('aios_operator') === '1') {
      sessionStorage.setItem(STORAGE_OP, '1');
    }
  } catch {
    /* private mode / quota */
  }
}

/** URL query only — used after persisted session mode is absent. */
export function readUrlShellBootstrapHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('aios_dev') === '1' || q.get('aios_operator') === '1';
  } catch {
    return false;
  }
}

/** Session/local legacy keys only (no URL). */
export function readLegacyStorageDiagnosticsHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(STORAGE_DIAG) === '1') return true;
    if (sessionStorage.getItem(STORAGE_OP) === '1') return true;
    if (localStorage.getItem(STORAGE_DIAG) === '1') return true;
    if (localStorage.getItem(STORAGE_OP) === '1') return true;
  } catch {
    /* */
  }
  return false;
}

/** @deprecated Use ShellStateContext — kept for narrow compatibility. */
export function readDiagnosticsChromeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return readUrlShellBootstrapHint() || readLegacyStorageDiagnosticsHint();
}
