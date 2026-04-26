# Cursor Agent Operating Layer Report

Relevant docs:
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor skills: https://cursor.sh/docs/skills
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor hooks: https://cursor.com/docs/hooks
- VCU API docs registry: `docs/vcu/api-docs.md`

## No-Mock Gate

This report lists project-level operating artifacts only. It does not claim lesson publication, install success, test success, link reachability, Supabase writes, task completion, or peer-review acceptance unless those are backed by real evidence. Missing runtime evidence is `unverified`.

## New Cursor Rules

- `.cursor/rules/cursor-agent-orchestration.mdc` controls VCU operating-layer coordination.
- `.cursor/rules/rust-sdk-mcp-development.mdc` controls Rust SDK and MCP server/client review and evidence.
- `.cursor/rules/mcp-ui-app-bridge-development.mdc` controls MCP UI, MCP Apps, App Bridge, and example-app review.
- `.cursor/rules/cursor-studio-project-planning.mdc` controls Cursor Studio project planning and task plan boundaries.
- `.cursor/rules/vcu-agent-verification.mdc` controls verification evidence and no-mock acceptance status.

## New Cursor Skills

- `.cursor/skills/vcu-auditor/SKILL.md` controls audits.
- `.cursor/skills/vcu-cartographer/SKILL.md` controls artifact mapping.
- `.cursor/skills/vcu-verification-agent/SKILL.md` controls evidence verification.
- `.cursor/skills/vcu-knowledgebase-curator/SKILL.md` controls knowledgebase curation.
- `.cursor/skills/rust-sdk-component-reviewer/SKILL.md` controls Rust SDK component checks.
- `.cursor/skills/mcp-ui-app-bridge-reviewer/SKILL.md` controls MCP UI/App Bridge review.
- `.cursor/skills/cursor-studio-project-planner/SKILL.md` controls project planning.
- `.cursor/skills/cursor-task-assignment-agent/SKILL.md` controls task assignment drafts.

## New Commands

- `.cursor/commands/vcu-audit.md` controls VCU audits.
- `.cursor/commands/vcu-verify.md` controls verification runs.
- `.cursor/commands/vcu-catalog.md` controls artifact cataloging.
- `.cursor/commands/vcu-seed-dry-run.md` controls Supabase seed dry-run review without writes.
- `.cursor/commands/rust-sdk-check.md` controls Rust SDK checks.
- `.cursor/commands/mcp-ui-check.md` controls MCP UI/App Bridge checks.
- `.cursor/commands/lesson-artifacts-next.md` controls next artifact gap reports without generation.
- `.cursor/commands/cursor-studio-plan.md` controls Cursor Studio plan drafts.
- `.cursor/commands/cursor-task-assign.md` controls task assignment drafts.

## New Agent Prompts

- `docs/vcu/agents/vcu-auditor-agent.md` and `.cursor/agents/vcu-auditor-agent.md` control auditor launch behavior.
- `docs/vcu/agents/vcu-cartographer-agent.md` and `.cursor/agents/vcu-cartographer-agent.md` control cartographer launch behavior.
- `docs/vcu/agents/vcu-verification-agent.md` and `.cursor/agents/vcu-verification-agent.md` control verification launch behavior.
- `docs/vcu/agents/vcu-knowledgebase-agent.md` and `.cursor/agents/vcu-knowledgebase-agent.md` control knowledgebase launch behavior.
- `docs/vcu/agents/rust-sdk-agent.md` and `.cursor/agents/rust-sdk-agent.md` control Rust SDK launch behavior.
- `docs/vcu/agents/mcp-ui-agent.md` and `.cursor/agents/mcp-ui-agent.md` control MCP UI/App Bridge launch behavior.
- `docs/vcu/agents/cursor-studio-planner-agent.md` and `.cursor/agents/cursor-studio-planner-agent.md` control Cursor Studio planning behavior.
- `docs/vcu/agents/cursor-task-assignment-agent.md` and `.cursor/agents/cursor-task-assignment-agent.md` control task assignment behavior.

## New Operating Indexes And Hooks

- `AGENTS.md` controls root onboarding for VCU/Rust/MCP Cursor agent work.
- `docs/vcu/skill-identity-registry.md` controls role-to-skill-to-command-to-prompt traceability.
- `.cursor/hooks.json` controls project hook registration for after-edit checks.
- `.cursor/hooks/vcu_artifact_gate.py` controls static checks for docs URLs, no-mock gates, output contracts, and obvious unsupported evidence language.

## Static Verification Performed

- `python3 .cursor/hooks/vcu_artifact_gate.py` exited `0` and reported: `VCU artifact gate: static checks passed`.
- Cursor IDE diagnostics reported no linter errors for `AGENTS.md`, `.cursor/rules`, `.cursor/skills`, `.cursor/commands`, `.cursor/agents`, `.cursor/hooks`, and `docs/vcu`.
- The static gate checks source URL or registry references, no-mock gate language, verifiable output/output contract language, and obvious unsupported evidence phrases for the new operating-layer artifacts.

## Verifiable Output Contract

This report output is verifiable by rerunning `python3 .cursor/hooks/vcu_artifact_gate.py` from the repository root and by inspecting the paths listed above. Runtime behavior remains unverified unless separate real commands are run and logged.

## What Remains Unverified

- Live Cursor discovery and invocation of `.cursor/agents/*.md` is unverified; they are provided as launch prompts and indexed by docs, skills, commands, and `AGENTS.md`.
- Live Cursor hook invocation is unverified until Cursor executes `.cursor/hooks.json` during an agent edit cycle.
- Network reachability for cited docs URLs is unverified unless separately checked.
- Rust SDK install/test success, MCP UI browser behavior, Supabase seed dry-run behavior, and task execution are unverified unless real commands are run and logged.
- No per-lesson artifacts were generated, by design.
