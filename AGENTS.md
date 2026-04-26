# AGENTS.md

Relevant docs:
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor skills: https://cursor.sh/docs/skills
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor hooks: https://cursor.com/docs/hooks
- VCU API docs registry: `docs/vcu/api-docs.md`
- Rust `skills` CLI crate: https://crates.io/crates/skills
- Rust `skills` library docs: https://docs.rs/skills/latest/skills/
- `skillshub` crate: https://crates.io/crates/skillshub
- `skillshub` repository: https://github.com/EYH0602/skillshub
- Rust skills rule knowledgebase: https://github.com/leonardomso/rust-skills

## Cursor Agent Operating Layer

This project uses `.cursor/rules`, `.cursor/skills`, `.cursor/commands`, `.cursor/agents`, `.cursor/hooks.json`, and `docs/vcu/agents` as the Cursor Agent Operating Layer for VCU, Rust SDK, MCP UI/App Bridge, Cursor Studio planning, and task assignment work.

## Trigger Scenarios

Apply this layer when the user asks for VCU audits, VCU cataloging, verification, knowledgebase curation, Rust SDK component review/install checks, MCP UI/App Bridge review, Cursor Studio project planning, or task assignment.

For Rust skill work, treat the native `skills` CLI (`cargo install skills`, `skills init`, `skills list`, `skills push`, `skills validate`) as the deployment protocol and `leonardomso/rust-skills` as the reusable rule knowledgebase. Check both before creating new Cursor rules or claiming deployed skill state.

For skill discovery, tap linking, and tool authority, treat `skillshub` as the AI OS metadata protocol. A skill's `allowed-tools` frontmatter is an input to shell authority, but it does not override role, scope, shell state, or system prompt requirements.

## No-Mock Gate

Do not create or accept mock lessons, mock installs, mock tests, fake logs, simulated exit codes, placeholder evidence, fabricated review results, unsupported source claims, or unverified completion status. If evidence is missing, report `blocked` or `unverified`.

## May Change

- Project-level Cursor rules, skills, commands, hooks, agent prompts, VCU registries, reports, and review-stage plans.

## May Not Change

- Per-lesson artifacts, Supabase rows, published/completed status, runtime task queues, secrets, or private system prompts unless explicitly requested and verified.

## Verifiable Output

Every operating-layer result must include source URLs, files inspected, commands run when applicable, environment, exit code, important output lines, no-mock gate result, and remaining `blocked` or `unverified` items.
