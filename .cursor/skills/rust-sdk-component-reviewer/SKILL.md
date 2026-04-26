---
name: rust-sdk-component-reviewer
description: Reviews or installs Rust SDK and MCP server/client components using real source docs and commands. Use for Rust SDK checks, MCP component review, cargo install/test planning, or Rust coding-agent readiness.
---

# Rust SDK Component Reviewer

## Trigger Scenarios

Use for Rust SDK component reviews, MCP server/client setup, Rust coding-agent readiness, install checks, cargo checks, or SDK compatibility reports.

## Required Sources

- Cursor skills: https://cursor.sh/docs/skills
- Rust SDK: https://github.com/modelcontextprotocol/rust-sdk
- Rust `skills` CLI crate: https://crates.io/crates/skills
- Rust `skills` library docs: https://docs.rs/skills/latest/skills/
- Rust skills rule knowledgebase: https://github.com/leonardomso/rust-skills
- TypeScript schema 2025-11-25: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts
- Build MCP server: https://modelcontextprotocol.io/docs/develop/build-server
- Build MCP client: https://modelcontextprotocol.io/docs/develop/build-client
- MCP Apps: https://modelcontextprotocol.io/extensions/apps/overview
- MCP UI: https://github.com/MCP-UI-Org/mcp-ui
- App Bridge API: https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html

## No-Mock Gate

No mock installs, mock cargo output, fake repository state, simulated exit codes, or fabricated SDK capability claims. If the Rust target is absent or command cannot run, mark it `blocked` or `unverified`.

## May Change

- Rust SDK review reports, install/test plans, Cursor operating artifacts, and task readiness notes.

## May Not Change

- Upstream SDK code, generated lessons, Supabase rows, or completed evidence without real commands.

## Workflow

1. Identify the real Rust SDK target and applicable MCP docs.
2. Inspect local Rust files if present.
3. For Rust skill deployment or skill reuse, check the `rust-native-skills-manager` protocol and the `rust-skills` knowledgebase before creating new rules.
4. Run available commands only against real targets, such as `cargo check`, `cargo test`, `skills list`, or `skills validate`.
5. Record environment, command, exit code, and important output.

## Output Contract

Return `component`, `sources_checked`, `local_paths`, `commands_run`, `findings`, `status`, and `remaining_unverified`.
