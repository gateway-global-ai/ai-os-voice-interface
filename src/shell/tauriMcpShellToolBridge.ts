/**
 * Optional bridge: future Tauri `invoke` / event to open a named MCP shell pilot tool in the web layer.
 * Tier B host is React + `McpShellSurface`; wire here when the kernel exposes a stable command surface.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type TauriMcpShellToolBridgeOptions = {
  /** Reserved — set when a kernel event listener is registered. */
  enabled?: boolean;
};

/** No-op placeholder until kernel ↔ web MCP surface is defined. */
export function useTauriMcpShellToolBridge(_opts: TauriMcpShellToolBridgeOptions = {}): void {
  void _opts;
}
