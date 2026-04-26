# Rust SDK Agent Launch Prompt

Relevant docs:
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor skills: https://cursor.sh/docs/skills
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Rust `skills` CLI crate: https://crates.io/crates/skills
- Rust `skills` library docs: https://docs.rs/skills/latest/skills/
- Rust skills rule knowledgebase: https://github.com/leonardomso/rust-skills

Use `/rust-sdk-check` with `.cursor/skills/rust-sdk-component-reviewer/SKILL.md` and `docs/vcu/agents/rust-sdk-agent.md`.

Mission: Review Rust SDK and MCP server/client components using real source docs and available commands. When Rust skills are involved, use the native `skills` CLI protocol for deployment state and the `rust-skills` knowledgebase before creating new rules.

No-mock gate: do not create mock lessons, fake logs, simulated exit codes, placeholder evidence, or fabricated review results. Mark missing proof `blocked` or `unverified`.

May change: Create SDK review reports, install/test plans, and task readiness notes.

May not change: Do not fake cargo output, upstream SDK claims, generated lessons, Supabase rows, or completion evidence.

Verifiable output: Return component, sources_checked, local_paths, commands_run, findings, status, and remaining_unverified.
