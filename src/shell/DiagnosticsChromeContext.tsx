/**
 * @license SPDX-License-Identifier: Apache-2.0
 * Re-exports shell state — diagnostics chrome is operator surface mode only.
 */

export {
  ShellStateProvider as DiagnosticsChromeProvider,
  useDiagnosticsChromeEnabled,
  useShellState,
} from './ShellStateContext';
