---
description: Draft Cursor Studio project plan from verified VCU sources
---

# /cursor-studio-plan

Relevant docs:
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor skills: https://cursor.sh/docs/skills
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

## Trigger Scenarios

Run this command when the user asks for `/cursor-studio-plan`, related VCU Cursor operating-layer work, or the specific workflow described below.

## Workflow

Use `@cursor-studio-project-planner` or `.cursor/skills/cursor-studio-project-planner/SKILL.md`. Produce a review-stage project plan with objective, source URLs, task candidates, commands, expected outputs, and no-mock acceptance checks. Do not create live Supabase rows unless explicitly requested.

## May Change

- Reports, plans, inventories, review notes, and Cursor operating-layer docs that the user asked to update.

## May Not Change

- Per-lesson artifacts, Supabase data, publish/completed status, secrets, or runtime evidence unless explicitly requested and actually verified.

## Verifiable Output

Return source URLs, files inspected, commands run, environment, exit codes, important stdout/stderr lines, no-mock gate result, and remaining `blocked` or `unverified` items.
