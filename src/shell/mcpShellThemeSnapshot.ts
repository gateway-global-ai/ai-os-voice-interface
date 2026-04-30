/**
 * Browser-side snapshot of shell tokens for MCP App HTML injection or debugging.
 * Canonical names live in `src/index.css`; pilot HTML literals stay in `server/mcpShellPilot/mcpShellThemeCss.ts`.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** Keys mirrored in `server/mcpShellPilot/mcpShellThemeCss.ts` — keep lists aligned when adding tokens. */
export const MCP_SHELL_THEME_VAR_KEYS = [
  '--vcu-community-card-bg',
  '--vcu-community-detail-card-bg',
  '--vcu-community-card-border',
  '--vcu-community-heading',
  '--vcu-community-text',
  '--vcu-community-text-muted',
  '--vcu-community-tile-bg',
  '--vcu-community-tile-bg-hover',
  '--vcu-community-tile-border',
  '--vcu-community-accent-bg',
  '--vcu-community-accent-border',
  '--vcu-community-accent-text',
  '--panel-danger-text',
  '--shell-modal-backdrop',
] as const;

export type McpShellThemeVarKey = (typeof MCP_SHELL_THEME_VAR_KEYS)[number];

/**
 * Reads resolved custom properties from the host document (e.g. to build a `:root` style block for a UIResource).
 */
export function captureShellMcpThemeFromDocument(root: HTMLElement = document.documentElement): Record<string, string> {
  const style = getComputedStyle(root);
  const out: Record<string, string> = {};
  for (const key of MCP_SHELL_THEME_VAR_KEYS) {
    const v = style.getPropertyValue(key).trim();
    if (v.length > 0) out[key] = v;
  }
  return out;
}

export function shellMcpThemeToStyleBlock(vars: Record<string, string>): string {
  const lines = Object.entries(vars)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n');
  return `<style>\n  :root {\n${lines}\n  }\n</style>`;
}
