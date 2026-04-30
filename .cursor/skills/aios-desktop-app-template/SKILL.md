---
name: aios-desktop-app-template
description: Generates repeatable voice-first AI OS desktop apps with native panels, operator-token proxy routes, backend endpoint contracts, Rust MCP server skeletons, and no-mock verification. Use when creating, spawning, or templating a new AI OS desktop app, app panel, MCP-backed app, or Rust-managed app skill.
allowed-tools:
  - ReadFile
  - Glob
  - rg
  - Shell
  - ApplyPatch
  - ReadLints
license: Apache-2.0
metadata:
  author: Gateway Global AI
  version: "1.0"
---

# AI OS Desktop App Template

## Primary Sources

- Cursor skills: https://cursor.sh/docs/skills
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Rust `skills` CLI crate: https://crates.io/crates/skills
- Rust `skills` docs: https://docs.rs/skills/latest/skills/
- MCP Rust SDK: https://github.com/modelcontextprotocol/rust-sdk
- MCP build server docs: https://modelcontextprotocol.io/docs/develop/build-server

## Trigger Scenarios

Use this skill when the user asks to:

- Create or spawn a new AI OS desktop app.
- Generate a native app panel with an intent menu.
- Add an operator-authenticated same-origin proxy.
- Build a Rust MCP-backed app or app tool server.
- Convert a one-off dashboard into a reusable voice-first app pattern.

## No-Mock Gate

Generated apps must open to a voice-first start page. Do not auto-load dashboard data on launch.

Do not fabricate endpoint responses, active-user counts, admin-control effects, Supabase rows, MCP tool results, cargo output, `skills` output, or smoke checks. If a route, table, credential, install, or command cannot be verified, mark it `blocked` or `unverified` with the exact reason.

## Canonical Template Paths

- Manifest schema: `templates/aios-desktop-app/manifest.schema.json`
- Example manifest: `templates/aios-desktop-app/app.manifest.example.json`
- Panel template: `templates/aios-desktop-app/src/AppPanel.tsx.template`
- Proxy template: `templates/aios-desktop-app/server/appProxyServe.ts.template`
- Backend contract template: `templates/aios-desktop-app/contracts/backend-contract.md.template`
- Rust MCP template: `templates/aios-desktop-app/rust-mcp-server/`
- Generator: `scripts/generate-aios-desktop-app.ts`

## Workflow

1. Read or create an app manifest with `appId`, `title`, `icon`, `description`, `requiredRole`, `proxyBase`, `backendBaseEnv`, `backendAuthEnv`, `intentPaths`, `backendEndpoints`, `mcpTools`, and `noMockEvidence`.
2. Ensure every intent has `loadsOnStart: false` or omits it. AI OS apps must start at the voice-first start page.
3. Run the generator:

   ```shell
   tsx scripts/generate-aios-desktop-app.ts <manifest.json> <output-dir>
   ```

4. Wire generated app files into the real app only after reviewing the generated code and verifying the target app id and routes.
5. Mount generated proxy handlers in both `server/prodHost.ts` and `vite.config.ts` if the app is accepted for runtime use.
6. If Rust MCP tooling is required, verify:

   ```shell
   rustc --version
   cargo --version
   skills --version
   cargo check
   skills validate .cursor/skills/aios-desktop-app-template
   ```

7. For unavailable commands, report `blocked` with the command and error. Do not claim a deployed skill or MCP server without real command evidence.

## App UX Requirements

- Start page first: app name, purpose, voice prompt, and visible intent cards.
- Dashboard is one intent target, not the launch target.
- Admin controls must be directly reachable from the start page when present.
- Use `--panel-*` shell tokens only for color/theming.
- Respect shell header/footer chrome and keep close/maximize controls visible.
- Raw JSON diagnostics should be behind a selected view or diagnostics section, not the opening screen.

## Output Contract

Return changed paths, generated paths, source docs used, commands run with exit codes, verification status, no-mock gate result, and any remaining `blocked` or `unverified` items.
