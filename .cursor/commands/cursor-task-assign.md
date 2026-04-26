---
description: Draft Cursor task assignment packet
---

# /cursor-task-assign

Relevant docs:
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor skills: https://cursor.sh/docs/skills
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

## Trigger Scenarios

Run this command when the user asks for `/cursor-task-assign`, related VCU Cursor operating-layer work, or the specific workflow described below.

## Workflow

Use `@cursor-task-assignment-agent` or `.cursor/skills/cursor-task-assignment-agent/SKILL.md`. Produce review-stage task assignment packets with source URLs, tool/resource map, commands required, expected outputs, and no-mock verification gates. Do not mark tasks completed without real evidence.

## May Change

- Reports, plans, inventories, review notes, and Cursor operating-layer docs that the user asked to update.

## May Not Change

- Per-lesson artifacts, Supabase data, publish/completed status, secrets, or runtime evidence unless explicitly requested and actually verified.

## Verifiable Output

Return source URLs, files inspected, commands run, environment, exit codes, important stdout/stderr lines, no-mock gate result, and remaining `blocked` or `unverified` items.
