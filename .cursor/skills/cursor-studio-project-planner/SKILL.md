---
name: cursor-studio-project-planner
description: Creates review-stage Cursor Studio project plans from verified VCU knowledge. Use when planning projects, milestones, acceptance checks, or project/task drafts for Gemini Voice AI and Rust coding-agent work.
---

# Cursor Studio Project Planner

## Trigger Scenarios

Use for Cursor Studio plans, VCU project plans, milestones, acceptance criteria, and task readiness packets derived from verified sources.

## Required Sources

- Cursor skills: https://cursor.sh/docs/skills
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor hooks: https://cursor.com/docs/hooks
- VCU API docs registry: `docs/vcu/api-docs.md`
- VCU no-mock rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`

- Rust SDK: https://github.com/modelcontextprotocol/rust-sdk
- TypeScript schema 2025-11-25: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts
- Build MCP server: https://modelcontextprotocol.io/docs/develop/build-server
- Build MCP client: https://modelcontextprotocol.io/docs/develop/build-client
- MCP Apps: https://modelcontextprotocol.io/extensions/apps/overview
- MCP UI: https://github.com/MCP-UI-Org/mcp-ui
- App Bridge API: https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html

## No-Mock Gate

Do not invent project status, task completion, agent capabilities, install evidence, or acceptance proof. Mark unavailable inputs `blocked` or `unverified`.

## May Change

- Project plan drafts, task breakdowns, acceptance checklists, and operating-layer reports.

## May Not Change

- Supabase rows, production task queues, completed status, or per-lesson content without explicit instruction and evidence.

## Workflow

1. Start from verified source docs or accepted review material.
2. Define objective, scope, dependencies, commands, expected outputs, and acceptance gates.
3. Assign status as review-stage unless all evidence exists.
4. Separate planning from execution.

## Output Contract

Return `project_plan`, `source_urls`, `tasks`, `acceptance_checks`, `blocked_dependencies`, and `remaining_unverified`.
