# VCU Skill Identity Registry

Relevant docs:
- Cursor skills: https://cursor.sh/docs/skills
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor hooks: https://cursor.com/docs/hooks
- Rust `skills` crate: https://crates.io/crates/skills
- Rust `skills` docs: https://docs.rs/skills/latest/skills/
- `skillshub` crate: https://crates.io/crates/skillshub
- `skillshub` repository: https://github.com/EYH0602/skillshub
- VCU API docs registry: `docs/vcu/api-docs.md`

## No-Mock Gate

This registry records behavior controls only. It must not invent lesson artifacts, seed rows, install logs, test results, task completions, or review acceptance. Missing evidence is `blocked` or `unverified`.

## Runtime Roles

| Skill | Runtime role | Command trigger | Agent prompt | What it controls | May change | May not change | Verifiable output |
|---|---|---|---|---|---|---|---|
| `.cursor/skills/vcu-auditor/SKILL.md` | VCU auditor | `/vcu-audit` | `docs/vcu/agents/vcu-auditor-agent.md` | Audits rules, skills, commands, hooks, prompts, reports, source citations, no-mock gates, and missing evidence. | Reports, plans, indexes, review notes, and operating-layer docs. | Per-lesson artifacts, Supabase state, secrets, fake evidence, or completed/published status. | Source URLs, paths inspected, commands run, exit codes/output, no-mock result, and remaining `blocked`/`unverified`. |
| `.cursor/skills/vcu-cartographer/SKILL.md` | VCU cartographer | `/vcu-catalog` | `docs/vcu/agents/vcu-cartographer-agent.md` | Maps artifacts, source docs, controls, runtime roles, and gaps. | Reports, plans, indexes, review notes, and operating-layer docs. | Per-lesson artifacts, Supabase state, secrets, fake evidence, or completed/published status. | Source URLs, paths inspected, commands run, exit codes/output, no-mock result, and remaining `blocked`/`unverified`. |
| `.cursor/skills/vcu-verification-agent/SKILL.md` | VCU verification agent | `/vcu-verify` | `docs/vcu/agents/vcu-verification-agent.md` | Verifies source-backed claims, real commands, link evidence, and no-mock acceptance gates. | Reports, plans, indexes, review notes, and operating-layer docs. | Per-lesson artifacts, Supabase state, secrets, fake evidence, or completed/published status. | Source URLs, paths inspected, commands run, exit codes/output, no-mock result, and remaining `blocked`/`unverified`. |
| `.cursor/skills/vcu-knowledgebase-curator/SKILL.md` | VCU knowledgebase curator | `/vcu-catalog` | `docs/vcu/agents/vcu-knowledgebase-agent.md` | Curates source registries, artifact indexes, and knowledgebase reports from verified docs/local artifacts. | Reports, plans, indexes, review notes, and operating-layer docs. | Per-lesson artifacts, Supabase state, secrets, fake evidence, or completed/published status. | Source URLs, paths inspected, commands run, exit codes/output, no-mock result, and remaining `blocked`/`unverified`. |
| `.cursor/skills/rust-sdk-component-reviewer/SKILL.md` | Rust SDK component reviewer | `/rust-sdk-check` | `docs/vcu/agents/rust-sdk-agent.md` | Reviews Rust SDK and MCP server/client components using primary docs and real commands. | Reports, plans, indexes, review notes, and operating-layer docs. | Per-lesson artifacts, Supabase state, secrets, fake evidence, or completed/published status. | Source URLs, paths inspected, commands run, exit codes/output, no-mock result, and remaining `blocked`/`unverified`. |
| `.cursor/skills/rust-native-skills-manager/SKILL.md` | Rust native skills manager | `open_skill_registry` shell action / native `skills` CLI commands | Supabase `native_skill_protocols` registry | Installs, initializes, validates, lists, pushes, imports, renders, and syncs skills through the Rust `skills` CLI protocol. | Skill source folders approved by the user, `~/.skills.toml` when approved, native skill protocol evidence rows, and registry metadata. | Hand-copied deployed skills when `skills` is available, fake validation, non-dry-run push/sync without approval, secrets, or private logs in public rows. | Crates.io/docs URLs, dependency checks, commands run, exit codes/output summaries, `skills list` deployment state, and remaining `blocked`/`unverified`. |
| `.cursor/skills/skillshub-authority-manager/SKILL.md` | Skillshub authority manager | `open_skill_registry` shell action / `skillshub` CLI commands | Supabase `skillshub_protocols`, `skill_taps`, `skill_allowed_tools`, and `intent_permission_profiles` registries | Discovers taps, inspects SKILL.md metadata, links skills to detected agents, and enforces role/scope/tool authority. | Skillshub registry docs, review-stage Supabase rows, authority reports, and approved local skill source folders. | Unrestricted tool grants, fake linked-agent state, destructive clean commands without approval, or secret/private log storage. | Crates.io/repo URLs, tap or skill refs, allowed-tools metadata, authority decision, commands run, exit codes/output summaries, and remaining `blocked`/`unverified`. |
| `.cursor/skills/mcp-ui-app-bridge-reviewer/SKILL.md` | MCP UI/App Bridge reviewer | `/mcp-ui-check` | `docs/vcu/agents/mcp-ui-agent.md` | Reviews MCP UI, MCP Apps, App Bridge, and example app integrations. | Reports, plans, indexes, review notes, and operating-layer docs. | Per-lesson artifacts, Supabase state, secrets, fake evidence, or completed/published status. | Source URLs, paths inspected, commands run, exit codes/output, no-mock result, and remaining `blocked`/`unverified`. |
| `.cursor/skills/cursor-studio-project-planner/SKILL.md` | Cursor Studio project planner | `/cursor-studio-plan` | `docs/vcu/agents/cursor-studio-planner-agent.md` | Creates review-stage project plans from verified VCU sources. | Reports, plans, indexes, review notes, and operating-layer docs. | Per-lesson artifacts, Supabase state, secrets, fake evidence, or completed/published status. | Source URLs, paths inspected, commands run, exit codes/output, no-mock result, and remaining `blocked`/`unverified`. |
| `.cursor/skills/cursor-task-assignment-agent/SKILL.md` | Cursor task assignment agent | `/cursor-task-assign` | `docs/vcu/agents/cursor-task-assignment-agent.md` | Prepares review-stage task assignment packets and coding-agent handoffs. | Reports, plans, indexes, review notes, and operating-layer docs. | Per-lesson artifacts, Supabase state, secrets, fake evidence, or completed/published status. | Source URLs, paths inspected, commands run, exit codes/output, no-mock result, and remaining `blocked`/`unverified`. |

## Remaining Unverified

- Runtime discovery of `.cursor/agents/*.md` as first-class Cursor agent definitions is unverified; they are included as project launch prompts and indexed from `AGENTS.md`, commands, skills, and reports.
- Hook execution in a live Cursor agent loop is unverified until Cursor runs `.cursor/hooks.json`; static hook script execution can be checked locally.
