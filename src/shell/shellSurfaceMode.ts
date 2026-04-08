/**
 * Authoritative shell surface mode (primary vs developer vs operator).
 * Aligns with AIOS AMD-2026-007 / SPEC-006–007: shell state is not domain intent execution.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type ShellSurfaceMode = 'primary' | 'developer' | 'operator';

export const SHELL_SURFACE_MODE_STORAGE_KEY = 'aios.shell.surfaceMode';

export function isShellSurfaceMode(v: string | null | undefined): v is ShellSurfaceMode {
  return v === 'primary' || v === 'developer' || v === 'operator';
}
