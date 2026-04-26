---
description: Audit VCU Cursor operating artifacts
---

# /vcu-audit

Relevant docs:
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor skills: https://cursor.sh/docs/skills
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

## Trigger Scenarios

Run this command when the user asks for `/vcu-audit`, related VCU Cursor operating-layer work, or the specific workflow described below.

## Workflow

Use `@vcu-auditor` or `.cursor/skills/vcu-auditor/SKILL.md` to audit requested VCU rules, skills, commands, prompts, hooks, reports, Rust SDK workflows, or MCP UI workflows. Produce findings first, cite exact files and docs URLs, and list missing evidence as `blocked` or `unverified`.

## May Change

- Reports, plans, inventories, review notes, and Cursor operating-layer docs that the user asked to update.

## May Not Change

- Per-lesson artifacts, Supabase data, publish/completed status, secrets, or runtime evidence unless explicitly requested and actually verified.

## Verifiable Output

Return source URLs, files inspected, commands run, environment, exit codes, important stdout/stderr lines, no-mock gate result, and remaining `blocked` or `unverified` items.
