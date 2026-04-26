---
name: vcu-lesson-builder
description: Builds real, source-backed Vibe Coding University lesson packages. Use when creating MCP, MCP Apps, Rust SDK, Supabase lesson rows, Cursor rules, skills, agent prompts, install tests, aptitude tests, or multimodal lesson content.
---

# VCU Lesson Builder

## Hard Rule

No mock data, mock lessons, mock installs, mock tests, mock triangulation, fake logs, placeholder rows, or simulated evidence. If anything cannot be verified, mark it `blocked` or `unverified`.

## Required Inputs

- Lesson id, title, level, prerequisites, and learning outcomes.
- Primary docs URL from the approved docs list below.
- Real install/test target and expected output.
- Cursor rule path, skill path, agent prompt path, and Supabase row target.

## Build Workflow

1. Read the primary docs before writing lesson content.
2. Extract only claims supported by primary docs or verified local code.
3. Produce the lesson package:
   - explanation: what it is and why it matters
   - install steps
   - real test steps
   - example project
   - Gemini Voice narration script
   - text lesson
   - video/visual aid plan
   - aptitude test with answer key
   - Supabase row payload draft
   - Cursor rule, skill, and agent prompt draft
4. Record verification status as `verified`, `blocked`, or `unverified`.
5. Stop before publish until `vcu-lesson-reviewer` passes the no-mock gate.

## Approved API Docs

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

## Output Contract

Return a concise manifest with docs citations, generated artifact paths, install/test evidence requirements, and publish blockers.
