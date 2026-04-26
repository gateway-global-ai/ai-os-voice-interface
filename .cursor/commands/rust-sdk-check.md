---
description: Check Rust SDK component readiness
---

# /rust-sdk-check

Relevant docs:
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor skills: https://cursor.sh/docs/skills
- Rust `skills` CLI crate: https://crates.io/crates/skills
- Rust `skills` library docs: https://docs.rs/skills/latest/skills/
- Rust skills rule knowledgebase: https://github.com/leonardomso/rust-skills
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

## Trigger Scenarios

Run this command when the user asks for `/rust-sdk-check`, related VCU Cursor operating-layer work, or the specific workflow described below.

## Workflow

Use `@rust-sdk-component-reviewer` or `.cursor/skills/rust-sdk-component-reviewer/SKILL.md`. Verify Rust SDK/MCP claims against https://github.com/modelcontextprotocol/rust-sdk and MCP server/client docs. For Rust skill reuse or deployment, check the native `skills` CLI protocol and the `leonardomso/rust-skills` rule knowledgebase before creating new rules. Run real `cargo`, `skills`, or repository commands only when the target exists; otherwise mark `blocked` or `unverified`.

## May Change

- Reports, plans, inventories, review notes, and Cursor operating-layer docs that the user asked to update.

## May Not Change

- Per-lesson artifacts, Supabase data, publish/completed status, secrets, or runtime evidence unless explicitly requested and actually verified.

## Verifiable Output

Return source URLs, files inspected, commands run, environment, exit codes, important stdout/stderr lines, no-mock gate result, and remaining `blocked` or `unverified` items.
