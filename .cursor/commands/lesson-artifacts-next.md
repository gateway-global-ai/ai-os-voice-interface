---
description: Identify next VCU lesson artifact work without generating lessons
---

# /lesson-artifacts-next

Relevant docs:
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor skills: https://cursor.sh/docs/skills
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

## Trigger Scenarios

Run this command when the user asks for `/lesson-artifacts-next`, related VCU Cursor operating-layer work, or the specific workflow described below.

## Workflow

Use `@vcu-cartographer`, `@vcu-auditor`, and `@vcu-verification-agent` as needed to list the next missing per-lesson artifacts and blockers. Do not generate per-lesson content. Return paths, required source URLs, evidence required, and remaining `blocked` or `unverified` items.

## May Change

- Reports, plans, inventories, review notes, and Cursor operating-layer docs that the user asked to update.

## May Not Change

- Per-lesson artifacts, Supabase data, publish/completed status, secrets, or runtime evidence unless explicitly requested and actually verified.

## Verifiable Output

Return source URLs, files inspected, commands run, environment, exit codes, important stdout/stderr lines, no-mock gate result, and remaining `blocked` or `unverified` items.
