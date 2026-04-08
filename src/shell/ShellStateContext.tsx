/**
 * Authoritative shell surface mode + operator/developer chrome flags.
 * Shell-state is not modeled as skills (AMD-2026-007 / AIOS-SPEC-006).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ShellSurfaceMode } from './shellSurfaceMode';
import { resolveInitialSurfaceMode, writePersistedSurfaceMode } from './shellBootstrap';

export type ShellStateValue = {
  surfaceMode: ShellSurfaceMode;
  /** Full operator / diagnostics strip (mono, extended disclosure) — primary vs operator doctrine. */
  showOperatorShellChrome: boolean;
  /** Scope metrics HUD — on in developer or operator. */
  showDeveloperHud: boolean;
  setSurfaceMode: (mode: ShellSurfaceMode) => void;
};

const ShellStateContext = createContext<ShellStateValue | null>(null);

export function ShellStateProvider({ children }: { children: ReactNode }) {
  const [surfaceMode, setSurfaceModeState] = useState<ShellSurfaceMode>(() =>
    resolveInitialSurfaceMode(),
  );

  const setSurfaceMode = useCallback((mode: ShellSurfaceMode) => {
    setSurfaceModeState(mode);
    writePersistedSurfaceMode(mode);
  }, []);

  const value = useMemo<ShellStateValue>(() => {
    const showOperatorShellChrome = surfaceMode === 'operator';
    const showDeveloperHud = surfaceMode === 'developer' || surfaceMode === 'operator';
    return {
      surfaceMode,
      showOperatorShellChrome,
      showDeveloperHud,
      setSurfaceMode,
    };
  }, [surfaceMode, setSurfaceMode]);

  return (
    <ShellStateContext.Provider value={value}>{children}</ShellStateContext.Provider>
  );
}

export function useShellState(): ShellStateValue {
  const v = useContext(ShellStateContext);
  if (!v) {
    throw new Error('useShellState must be used within ShellStateProvider');
  }
  return v;
}

/** Operator diagnostics strip — same semantic as historical `showDiagnosticsChrome` for UI components. */
export function useDiagnosticsChromeEnabled(): boolean {
  return useShellState().showOperatorShellChrome;
}
