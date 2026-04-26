---
name: vcu-lesson-runner
description: Runs Vibe Coding University lesson work from verified source docs and local files. Use when a VCU lesson needs Cursor to follow exact instructions, run real commands, collect evidence, or report blocked/unverified status.
---

# VCU Lesson Runner

## Trigger Scenarios

Use when working through a VCU lesson, Rust SDK component, MCP UI/App Bridge exercise, Cursor instruction package, or Vibe Code Lab task.

## Required Sources

- Cursor plugins: https://cursor.com/docs/plugins.md
- Cursor skills: https://cursor.sh/docs/skills
- Rust SDK: https://github.com/modelcontextprotocol/rust-sdk
- Build MCP server: https://modelcontextprotocol.io/docs/develop/build-server
- Build MCP client: https://modelcontextprotocol.io/docs/develop/build-client
- MCP Apps: https://modelcontextprotocol.io/extensions/apps/overview
- MCP UI: https://github.com/MCP-UI-Org/mcp-ui
- App Bridge API: https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html

## No-Mock Gate

No mock installs, mock tests, fake logs, simulated exit codes, placeholder evidence, fabricated reviews, or unsupported claims. If a command cannot be run, mark it `blocked` or `unverified`.

## Workflow

1. Read the lesson row or local instructions and every cited source URL.
2. Verify required files exist before editing.
3. Run real commands only against real targets.
4. Capture command, environment, exit code, and important output.
5. Return blocked/unverified status for missing tools, docs, installs, tests, or credentials.

## May Change

- User-approved lesson workspace files and evidence notes.

## May Not Change

- Published/completed status, Supabase production rows, or secrets.

## Output Contract

Return `status`, `sources_checked`, `files_changed`, `commands_run`, `evidence`, `no_mock_gate`, and `remaining_unverified`.
