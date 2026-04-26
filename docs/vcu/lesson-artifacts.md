# VCU Lesson Artifact Index

Every Vibe Coding University lesson must resolve to a Cursor rule, skill, and agent prompt before it can be published. The canonical lesson rows live in `src/vcu/vcuCurriculum.ts` and seed into Supabase as review-stage records.

## Global Artifacts

- No-mock acceptance rule: `.cursor/rules/vcu-no-mock-acceptance.mdc`
- API docs source rule: `.cursor/rules/vcu-api-docs-sources.mdc`
- Triangulation gate rule: `.cursor/rules/vcu-triangulation-gate.mdc`
- Supabase project/task rule: `.cursor/rules/vcu-supabase-project-tasks.mdc`
- Lesson builder skill: `.cursor/skills/vcu-lesson-builder/SKILL.md`
- Lesson reviewer skill: `.cursor/skills/vcu-lesson-reviewer/SKILL.md`
- Agent task planner skill: `.cursor/skills/vcu-agent-task-planner/SKILL.md`
- Lesson builder agent prompt: `docs/vcu/agents/vcu-lesson-builder-agent.md`
- Lesson reviewer agent prompt: `docs/vcu/agents/vcu-lesson-reviewer-agent.md`
- Agent task planner prompt: `docs/vcu/agents/vcu-agent-task-planner-agent.md`
- API docs registry: `docs/vcu/api-docs.md`
- Lesson artifact index: `docs/vcu/lesson-artifacts.md`
- VCU Supabase schema: `supabase/migrations/002_vcu_university_schema.sql`
- Supabase TypeScript types: `src/lib/supabaseTypes.ts`
- VCU curriculum manifest: `src/vcu/vcuCurriculum.ts`
- Supabase seed importer: `scripts/seed-supabase.ts`

These global behavior artifacts seed into `vcu_behavior_artifacts` separately from per-lesson `university_lesson_artifacts`. The catalog stores references, source URLs, hashes, review state, no-mock state, and usage constraints; it must not store private system prompt contents or secrets.

## Per-Lesson Required Docs

- `mcp-rust-sdk`: https://github.com/modelcontextprotocol/rust-sdk
- `mcp-typescript-schema-2025-11-25`: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts
- `mcp-build-server`: https://modelcontextprotocol.io/docs/develop/build-server
- `mcp-build-client`: https://modelcontextprotocol.io/docs/develop/build-client
- `mcp-apps`: https://modelcontextprotocol.io/extensions/apps/overview
- `mcp-ui`: https://github.com/MCP-UI-Org/mcp-ui
- `mcp-app-bridge`: https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html
- `basic-server-react`: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react
- `basic-server-svelte`: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-svelte
- `transcript-server`: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/transcript-server
- `video-resource-server`: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/video-resource-server
- `say-server`: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/say-server
- `qr-server`: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/qr-server
- `map-server`: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/map-server

## Acceptance

The per-lesson paths seeded in Supabase are review targets. They must be created and reviewed before the lesson can move from `review` to `published`. Until then, the global VCU rules and skills apply to every lesson row.

No lesson may use mock data, mock install logs, mock tests, or mock triangulation.

## Cursor Agent Operating Layer

The following global behavior artifacts implement project-level Cursor controls. They are not per-lesson artifacts and must not be used as fake lesson completion evidence.

### Rules

- Cursor agent orchestration rule: `.cursor/rules/cursor-agent-orchestration.mdc`
- Rust SDK MCP development rule: `.cursor/rules/rust-sdk-mcp-development.mdc`
- MCP UI/App Bridge development rule: `.cursor/rules/mcp-ui-app-bridge-development.mdc`
- Cursor Studio project planning rule: `.cursor/rules/cursor-studio-project-planning.mdc`
- VCU agent verification rule: `.cursor/rules/vcu-agent-verification.mdc`

### Skills

- VCU auditor skill: `.cursor/skills/vcu-auditor/SKILL.md`
- VCU cartographer skill: `.cursor/skills/vcu-cartographer/SKILL.md`
- VCU verification agent skill: `.cursor/skills/vcu-verification-agent/SKILL.md`
- VCU knowledgebase curator skill: `.cursor/skills/vcu-knowledgebase-curator/SKILL.md`
- Rust SDK component reviewer skill: `.cursor/skills/rust-sdk-component-reviewer/SKILL.md`
- MCP UI/App Bridge reviewer skill: `.cursor/skills/mcp-ui-app-bridge-reviewer/SKILL.md`
- Cursor Studio project planner skill: `.cursor/skills/cursor-studio-project-planner/SKILL.md`
- Cursor task assignment agent skill: `.cursor/skills/cursor-task-assignment-agent/SKILL.md`

### Commands

- VCU audit command: `.cursor/commands/vcu-audit.md`
- VCU verification command: `.cursor/commands/vcu-verify.md`
- VCU catalog command: `.cursor/commands/vcu-catalog.md`
- VCU seed dry-run command: `.cursor/commands/vcu-seed-dry-run.md`
- Rust SDK check command: `.cursor/commands/rust-sdk-check.md`
- MCP UI check command: `.cursor/commands/mcp-ui-check.md`
- Lesson artifacts next command: `.cursor/commands/lesson-artifacts-next.md`
- Cursor Studio plan command: `.cursor/commands/cursor-studio-plan.md`
- Cursor task assignment command: `.cursor/commands/cursor-task-assign.md`

### Agent Prompts And Registries

- VCU auditor prompt: `docs/vcu/agents/vcu-auditor-agent.md` and `.cursor/agents/vcu-auditor-agent.md`
- VCU cartographer prompt: `docs/vcu/agents/vcu-cartographer-agent.md` and `.cursor/agents/vcu-cartographer-agent.md`
- VCU verification prompt: `docs/vcu/agents/vcu-verification-agent.md` and `.cursor/agents/vcu-verification-agent.md`
- VCU knowledgebase prompt: `docs/vcu/agents/vcu-knowledgebase-agent.md` and `.cursor/agents/vcu-knowledgebase-agent.md`
- Rust SDK prompt: `docs/vcu/agents/rust-sdk-agent.md` and `.cursor/agents/rust-sdk-agent.md`
- MCP UI prompt: `docs/vcu/agents/mcp-ui-agent.md` and `.cursor/agents/mcp-ui-agent.md`
- Cursor Studio planner prompt: `docs/vcu/agents/cursor-studio-planner-agent.md` and `.cursor/agents/cursor-studio-planner-agent.md`
- Cursor task assignment prompt: `docs/vcu/agents/cursor-task-assignment-agent.md` and `.cursor/agents/cursor-task-assignment-agent.md`
- Root agent onboarding: `AGENTS.md`
- Skill identity registry: `docs/vcu/skill-identity-registry.md`
- Operating-layer report: `docs/vcu/cursor-agent-operating-layer-report.md`
- Cursor hook config: `.cursor/hooks.json`
- Cursor hook gate: `.cursor/hooks/vcu_artifact_gate.py`

These artifacts must cite Cursor and MCP/VCU primary docs, include no-mock gates, define trigger scenarios, define may-change and may-not-change boundaries, and produce verifiable outputs. Runtime hook execution, link checks, installs, tests, Supabase writes, and agent task completion remain `unverified` until real evidence is attached.
