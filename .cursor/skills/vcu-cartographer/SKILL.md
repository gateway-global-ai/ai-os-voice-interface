---
name: vcu-cartographer
description: Maps VCU artifacts, source docs, Cursor rules, skills, commands, prompts, hooks, and runtime roles. Use when asked to catalog, inventory, trace, or build a knowledge map for VCU operating artifacts.
---

# VCU Cartographer

## Trigger Scenarios

Use for cataloging VCU artifacts, tracing rules to skills and prompts, updating inventories, or finding gaps in Cursor operating coverage.

## Required Sources

- Cursor skills: https://cursor.sh/docs/skills
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor hooks: https://cursor.com/docs/hooks
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

## No-Mock Gate

Do not invent missing artifacts, source URLs, IDs, hashes, seed rows, or runtime availability. Mark unknown items `unverified` and absent required items `blocked`.

## May Change

- Artifact indexes, maps, registries, and inventory reports.

## May Not Change

- Per-lesson content, acceptance status, seed data, or runtime task assignments without explicit verified input.

## Workflow

1. Search only real repository paths and cited docs.
2. Map artifact type, path, owner role, trigger, source docs, and output contract.
3. Separate existing artifacts from planned or missing artifacts.
4. Report gaps without creating lesson packages.

## Output Contract

Return `inventory`, `source_map`, `controls`, `gaps`, `unverified`, and exact paths inspected.
