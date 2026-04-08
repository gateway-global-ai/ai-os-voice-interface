/**
 * Interim device-local authority for shell surface transitions (primary | developer | operator).
 *
 * This is **not** identity, SSO, or tenant RBAC — only explicit device-local signals that
 * exist in this runtime today (URL query flags, legacy storage keys, optional session unlock
 * keys, optional Vite build-time opt-in). When a real authority layer exists, replace the
 * internals of `readInterimShellAuthority` without changing call sites.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import {
  LEGACY_SHELL_DIAG_KEY,
  LEGACY_SHELL_OP_KEY,
  readLegacyStorageDiagnosticsHint,
} from './shellChromeVisibility';
import type { ShellSurfaceMode } from './shellSurfaceMode';

/** Session/local explicit unlocks (console or tooling) — interim only. */
export const INTERIM_SHELL_OPERATOR_UNLOCK_KEY = 'aios.shell.interim.operator_unlock';
export const INTERIM_SHELL_DEVELOPER_UNLOCK_KEY = 'aios.shell.interim.developer_unlock';

export type InterimShellAuthority = {
  /** True when operator / diagnostics surface may be entered (stronger than primary-only). */
  operatorEligible: boolean;
  /** True when developer surface may be entered (diagnostic/developer/operator allowance). */
  developerEligible: boolean;
};

function readStorageOnOff(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(key) === '1' || localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function readUrlShellFlags(): { operator: boolean; developer: boolean } {
  if (typeof window === 'undefined') return { operator: false, developer: false };
  try {
    const q = new URLSearchParams(window.location.search);
    return {
      operator: q.get('aios_operator') === '1',
      developer: q.get('aios_dev') === '1',
    };
  } catch {
    return { operator: false, developer: false };
  }
}

function viteInterimAllowAll(): boolean {
  try {
    return import.meta.env?.VITE_AIOS_SHELL_INTERIM_ALLOW === 'true';
  } catch {
    return false;
  }
}

/**
 * Reads the best available **interim** elevation signals. Documented sources:
 * - URL `?aios_operator=1` / `?aios_dev=1`
 * - Legacy `aios.shell.operator` / `aios.shell.diagnostics` (session or local)
 * - `readLegacyStorageDiagnosticsHint()` (POL-SHELL-006 compatibility)
 * - Explicit unlock keys `aios.shell.interim.operator_unlock` / `aios.shell.interim.developer_unlock`
 * - Build: `VITE_AIOS_SHELL_INTERIM_ALLOW=true` (trusted builds / local dev only — not a security boundary)
 */
export function readInterimShellAuthority(): InterimShellAuthority {
  const url = readUrlShellFlags();
  const legacyOp = readStorageOnOff(LEGACY_SHELL_OP_KEY);
  const legacyDiag = readStorageOnOff(LEGACY_SHELL_DIAG_KEY);
  const legacyCombined = readLegacyStorageDiagnosticsHint();
  const interimOpUnlock = readStorageOnOff(INTERIM_SHELL_OPERATOR_UNLOCK_KEY);
  const interimDevUnlock = readStorageOnOff(INTERIM_SHELL_DEVELOPER_UNLOCK_KEY);
  const vite = viteInterimAllowAll();

  const operatorEligible =
    url.operator ||
    legacyOp ||
    legacyCombined ||
    interimOpUnlock ||
    vite;

  const developerEligible =
    url.developer ||
    legacyDiag ||
    interimDevUnlock ||
    vite ||
    operatorEligible;

  return { operatorEligible, developerEligible };
}

export const SHELL_AUTHORITY_DENIED_OPERATOR =
  "Operator diagnostics mode isn’t available. This session has no interim device-local authority (for example URL flags, storage unlock, or build-time opt-in). This is not signed-in identity — ask an administrator for an allowed launch URL or unlock procedure.";

export const SHELL_AUTHORITY_DENIED_DEVELOPER =
  "Developer shell mode isn’t available. This session has no interim device-local authority (for example URL flags, storage unlock, or build-time opt-in). This is not signed-in identity — ask an administrator for an allowed launch URL or unlock procedure.";

/**
 * Whether a transition **to** `target` surface is allowed under interim authority.
 * Transitions **to** primary are always allowed (exit / downgrade).
 */
export function allowShellSurfaceTransition(
  target: ShellSurfaceMode,
  authority: InterimShellAuthority,
): { ok: true } | { ok: false; userMessage: string } {
  if (target === 'primary') return { ok: true };
  if (target === 'operator') {
    if (authority.operatorEligible) return { ok: true };
    return { ok: false, userMessage: SHELL_AUTHORITY_DENIED_OPERATOR };
  }
  if (target === 'developer') {
    if (authority.developerEligible) return { ok: true };
    return { ok: false, userMessage: SHELL_AUTHORITY_DENIED_DEVELOPER };
  }
  return { ok: true };
}

/** If persisted or computed mode is elevated but this browser session lacks interim authority, fall back to primary. */
export function clampSurfaceModeToInterimAuthority(
  mode: ShellSurfaceMode,
  authority: InterimShellAuthority,
): ShellSurfaceMode {
  const gate = allowShellSurfaceTransition(mode, authority);
  return gate.ok ? mode : 'primary';
}
