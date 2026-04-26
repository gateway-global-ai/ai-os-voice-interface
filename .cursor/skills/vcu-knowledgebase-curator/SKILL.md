---
name: vcu-knowledgebase-curator
description: Curates VCU knowledgebase indexes from primary docs and verified local artifacts. Use when updating VCU source registries, artifact maps, knowledgebase reports, or role catalogs.
---

# VCU Knowledgebase Curator

## Trigger Scenarios

Use when updating `docs/vcu/api-docs.md`, `docs/vcu/lesson-artifacts.md`, skill identity registries, operating-layer reports, or knowledge maps.

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

Do not add claims, lessons, source summaries, install outcomes, or catalog rows that were not verified from real docs or local files. Mark uncertain items `unverified`.

## May Change

- Knowledgebase docs, source registries, artifact indexes, and curation reports.

## May Not Change

- Runtime code, Supabase state, lesson publish status, or completion evidence.

## Workflow

1. Read the primary docs registry and local artifact index.
2. Add or update only source-backed metadata.
3. Preserve distinction between global operating artifacts and per-lesson artifacts.
4. Note stale, missing, or unreachable references as unverified.

## Output Contract

Return `updated_paths`, `sources_added`, `artifacts_indexed`, `no_mock_gate`, and `remaining_unverified`.
