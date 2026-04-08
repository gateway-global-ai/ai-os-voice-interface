/**
 * Initial shell surface mode: session persistence > URL > legacy storage hints.
 * Bootstrap/debug flags are lowest precedence after explicit session mode (POL-SHELL-006).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import {
  persistDiagnosticsChromeFlagsFromUrl,
  readLegacyStorageDiagnosticsHint,
} from './shellChromeVisibility';
import { clampSurfaceModeToInterimAuthority, readInterimShellAuthority } from './shellAuthority';
import {
  type ShellSurfaceMode,
  SHELL_SURFACE_MODE_STORAGE_KEY,
  isShellSurfaceMode,
} from './shellSurfaceMode';

export function readPersistedSurfaceMode(): ShellSurfaceMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(SHELL_SURFACE_MODE_STORAGE_KEY);
    if (isShellSurfaceMode(v)) return v;
  } catch {
    /* */
  }
  return null;
}

export function writePersistedSurfaceMode(mode: ShellSurfaceMode): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SHELL_SURFACE_MODE_STORAGE_KEY, mode);
  } catch {
    /* */
  }
}

/**
 * Precedence: (1) session `aios.shell.surfaceMode` (2) URL `aios_operator` / `aios_dev`
 * (3) persist URL → legacy keys, then legacy storage-only hint → operator
 * (4) primary.
 * Then **interim authority clamp**: elevated modes without device-local elevation fall back to primary.
 */
function resolveInitialSurfaceModeUncapped(): ShellSurfaceMode {
  if (typeof window === 'undefined') return 'primary';
  const persisted = readPersistedSurfaceMode();
  if (persisted) return persisted;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('aios_operator') === '1') return 'operator';
    if (q.get('aios_dev') === '1') return 'developer';
  } catch {
    /* */
  }
  persistDiagnosticsChromeFlagsFromUrl();
  if (readLegacyStorageDiagnosticsHint()) return 'operator';
  return 'primary';
}

export function resolveInitialSurfaceMode(): ShellSurfaceMode {
  const raw = resolveInitialSurfaceModeUncapped();
  const auth = readInterimShellAuthority();
  return clampSurfaceModeToInterimAuthority(raw, auth);
}
