---
description: Check MCP UI and App Bridge readiness
---

# /mcp-ui-check

Relevant docs:
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor skills: https://cursor.sh/docs/skills
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

## Trigger Scenarios

Run this command when the user asks for `/mcp-ui-check`, related VCU Cursor operating-layer work, or the specific workflow described below.

## Workflow

Use `@mcp-ui-app-bridge-reviewer` or `.cursor/skills/mcp-ui-app-bridge-reviewer/SKILL.md`. Verify MCP UI, MCP Apps, App Bridge, and example-app claims against primary docs. Browser or UI evidence must come from real tooling, not simulated screenshots or placeholder output.

## May Change

- Reports, plans, inventories, review notes, and Cursor operating-layer docs that the user asked to update.

## May Not Change

- Per-lesson artifacts, Supabase data, publish/completed status, secrets, or runtime evidence unless explicitly requested and actually verified.

## Verifiable Output

Return source URLs, files inspected, commands run, environment, exit codes, important stdout/stderr lines, no-mock gate result, and remaining `blocked` or `unverified` items.
