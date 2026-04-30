/**
 * Injected into MCP App HTML so iframe UI aligns with AI OS light community tokens.
 * Keep in sync with :root entries in src/index.css (--vcu-community-*, --shell-modal-backdrop when added).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export const MCP_SHELL_THEME_STYLE_BLOCK = `
<style>
  :root {
    --shell-modal-backdrop: rgba(2, 6, 23, 0.55);
    --vcu-community-card-bg: rgba(255, 255, 255, 0.97);
    --vcu-community-detail-card-bg: rgba(255, 255, 255, 0.8);
    --vcu-community-card-border: rgba(15, 23, 42, 0.1);
    --vcu-community-heading: rgb(15, 23, 42);
    --vcu-community-text: rgb(51, 65, 85);
    --vcu-community-text-muted: rgb(100, 116, 139);
    --vcu-community-tile-bg: rgb(248, 250, 252);
    --vcu-community-tile-bg-hover: rgb(241, 245, 249);
    --vcu-community-tile-border: rgba(59, 130, 246, 0.35);
    --vcu-community-accent-bg: rgba(37, 99, 235, 0.1);
    --vcu-community-accent-border: rgba(37, 99, 235, 0.45);
    --vcu-community-accent-text: rgb(30, 64, 175);
    --panel-danger-text: rgb(248, 113, 113);
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  body { margin: 0; padding: 1rem; color: var(--vcu-community-text); background: var(--vcu-community-detail-card-bg); }
  h1 { color: var(--vcu-community-heading); font-size: 1.25rem; margin: 0 0 0.75rem; }
  p.desc { color: var(--vcu-community-text-muted); font-size: 0.9rem; line-height: 1.5; margin: 0 0 1rem; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  button.tile {
    flex: 1 1 140px;
    border-radius: 0.75rem;
    border: 1px solid var(--vcu-community-tile-border);
    background: var(--vcu-community-tile-bg);
    color: var(--vcu-community-heading);
    padding: 0.85rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }
  button.tile:hover { background: var(--vcu-community-tile-bg-hover); }
  button.primary {
    border-color: var(--vcu-community-accent-border);
    background: var(--vcu-community-accent-bg);
    color: var(--vcu-community-accent-text);
  }
  label { display: block; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: var(--vcu-community-text-muted); margin-top: 0.75rem; }
  input {
    width: 100%; box-sizing: border-box; margin-top: 0.25rem; padding: 0.65rem 0.75rem; border-radius: 0.75rem;
    border: 1px solid var(--vcu-community-tile-border);
    background: var(--vcu-community-tile-bg); color: var(--vcu-community-heading); font-size: 0.9rem;
  }
  .err { color: var(--panel-danger-text); font-size: 0.85rem; margin-top: 0.5rem; }
</style>
`;
