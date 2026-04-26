---
name: vcu-agent-task-planner
description: Converts verified Vibe Coding University lessons into real Supabase project/task plans for Gemini Voice AI and the Rust coding agent. Use when creating projects, task queues, Rust SDK tool/resource assignments, or coding-agent instructions from VCU lessons.
---

# VCU Agent Task Planner

## Hard Rule

Do not invent tasks, tools, resources, installs, or completion evidence. No mock project state, mock task state, mock agent output, or simulated acceptance.

## Purpose

Turn verified lesson knowledge into project/task instructions that Gemini Voice AI can retrieve from Supabase and assign to the Rust coding agent.

## Workflow

1. Start from a reviewed lesson or final project with `accepted` status.
2. Identify the real Rust SDK tools/resources/prompts needed for the task.
3. Attach applicable docs URLs and schema references.
4. Create task instructions with:
   - objective
   - source docs
   - files or systems involved
   - required commands
   - expected outputs
   - acceptance checks
   - no-mock verification requirement
5. Store only verified or review-ready task payloads. Mark incomplete evidence as `blocked` or `unverified`.

## API Docs

- Rust SDK: https://github.com/modelcontextprotocol/rust-sdk
- TypeScript schema 2025-11-25: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts
- Build MCP server: https://modelcontextprotocol.io/docs/develop/build-server
- Build MCP client: https://modelcontextprotocol.io/docs/develop/build-client
- MCP Apps: https://modelcontextprotocol.io/extensions/apps/overview
- MCP UI: https://github.com/MCP-UI-Org/mcp-ui
- App Bridge: https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html
- Basic Server React: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react
- Basic Server Svelte: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-svelte
- Transcript Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/transcript-server
- Video Resource Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/video-resource-server
- Say Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/say-server
- QR Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/qr-server
- Map Server: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/map-server

## Acceptance

A task is not ready for the coding agent unless it has real source links, clear test commands, expected outputs, and an explicit no-mock acceptance gate.
