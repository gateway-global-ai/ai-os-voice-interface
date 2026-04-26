---
description: Review VCU Supabase seed readiness without writing data
---

# /vcu-seed-dry-run

Relevant docs:
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor skills: https://cursor.sh/docs/skills
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

## Trigger Scenarios

Run this command when the user asks for `/vcu-seed-dry-run`, related VCU Cursor operating-layer work, or the specific workflow described below.

## Workflow

Inspect `scripts/seed-supabase.ts`, `src/vcu/vcuCurriculum.ts`, `supabase/migrations/002_vcu_university_schema.sql`, and related docs. If running a dry-run command is available, run the real command and report exit code/output. Do not write Supabase data or create placeholder rows.

## May Change

- Reports, plans, inventories, review notes, and Cursor operating-layer docs that the user asked to update.

## May Not Change

- Per-lesson artifacts, Supabase data, publish/completed status, secrets, or runtime evidence unless explicitly requested and actually verified.

## Verifiable Output

Return source URLs, files inspected, commands run, environment, exit codes, important stdout/stderr lines, no-mock gate result, and remaining `blocked` or `unverified` items.
