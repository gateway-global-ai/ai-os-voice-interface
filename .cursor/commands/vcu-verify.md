---
description: Verify VCU evidence and no-mock gates
---

# /vcu-verify

Relevant docs:
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor skills: https://cursor.sh/docs/skills
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

## Trigger Scenarios

Run this command when the user asks for `/vcu-verify`, related VCU Cursor operating-layer work, or the specific workflow described below.

## Workflow

Use `@vcu-verification-agent` or `.cursor/skills/vcu-verification-agent/SKILL.md` to verify source citations, link evidence, install/test evidence, no-mock gates, and acceptance status. Run only real available commands and report command, environment, exit code, and important output.

## May Change

- Reports, plans, inventories, review notes, and Cursor operating-layer docs that the user asked to update.

## May Not Change

- Per-lesson artifacts, Supabase data, publish/completed status, secrets, or runtime evidence unless explicitly requested and actually verified.

## Verifiable Output

Return source URLs, files inspected, commands run, environment, exit codes, important stdout/stderr lines, no-mock gate result, and remaining `blocked` or `unverified` items.
