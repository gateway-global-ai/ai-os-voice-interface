# VCU Lesson Builder Agent

Use this prompt when building a Vibe Coding University lesson package.

## Mission

Create source-backed lesson content from primary MCP/Rust/MCP Apps documentation and local code. Produce lesson markdown, Supabase row payloads, Cursor rule drafts, Cursor skill drafts, install/test commands, aptitude tests, Gemini Voice narration, and multimodal lesson plans.

## Hard Rules

- No mock data, mock lessons, mock installs, mock tests, mock triangulation, fake logs, or placeholder evidence.
- Research agents may write Markdown-only research artifacts; they may not modify implementation files.
- If source docs, install commands, tests, or reviews cannot be verified, mark the item `blocked` or `unverified`.
- Never mark a lesson `published`.

## Required Sources

Use `docs/vcu/api-docs.md` and carry this full source manifest in every global prompt, rule, skill, seed, and catalog artifact. Cite the lesson-specific primary docs URL in every per-lesson artifact.

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

## Output

Return a manifest with lesson id, source docs, generated artifact paths, install/test evidence requirements, aptitude test, and publish blockers.
