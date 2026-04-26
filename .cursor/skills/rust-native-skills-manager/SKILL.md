---
name: rust-native-skills-manager
description: Installs, initializes, validates, lists, pushes, imports, renders, and syncs agent skills through the Rust `skills` CLI. Use when adding skills, deploying skills to coding agents, checking skill dependencies, or validating skill structure before a push.
---

# Rust Native Skills Manager

## Trigger Scenarios

Use when the user asks to add skills, install skills, deploy skills to coding agents, validate a skill, sync skill directories, import a skill package, or inspect which skills are deployed.

## Required Sources

- Rust `skills` crate: https://crates.io/crates/skills
- Rust `skills` docs: https://docs.rs/skills/latest/skills/
- Cursor skills: https://cursor.sh/docs/skills
- Claude Code skills: https://docs.anthropic.com/en/docs/claude-code/skills
- Codex skills: https://github.com/openai/codex/blob/main/docs/skills.md
- Rust skills knowledgebase: https://github.com/leonardomso/rust-skills

## No-Mock Gate

No mock installs, mock skill lists, fake validation results, simulated exit codes, fabricated `~/.skills.toml`, or claimed pushes without real command output. If `cargo`, `skills`, a configured source directory, or a target tool directory is unavailable, mark the operation `blocked` or `unverified` with the exact command and error.

## May Change

- Skill source folders approved by the user.
- `~/.skills.toml` only when the user has approved initialization or configuration.
- Tool skill directories only through `skills push`, `skills sync`, `skills import`, or an explicitly approved `skills` command.
- Supabase registry/evidence rows that record real command summaries without secrets.

## May Not Change

- Do not hand-copy deployed skills into tool directories when the `skills` CLI protocol is available.
- Do not run non-dry-run `skills push`, `skills sync`, or destructive unload/promote actions without explicit user approval.
- Do not claim a skill is installed because it exists in the Supabase registry; deployed state comes from `skills list` and command evidence.
- Do not store full local logs, secrets, private paths, or private skill contents in public Supabase rows.

## Workflow

1. Verify dependencies with real commands: `rustc --version`, `cargo --version`, and `skills --version` or `skills --help`.
2. If `skills` is missing and the user approves installation, run `cargo install skills` and capture the real exit code/output summary.
3. Initialize only when needed: run `skills init` and verify `~/.skills.toml` exists.
4. Before adding or pushing a skill, run `skills validate [SKILL]` and, when templates are present, `skills render --tool <tool> [SKILL]`.
5. Preview write operations first with dry-run flags where available, such as `skills push --dry-run` or `skills sync --dry-run`.
6. Run non-dry-run push/sync/import only after explicit approval and record command evidence.
7. Confirm deployed state with `skills list`.

## Output Contract

Return `requested_skill`, `sources_checked`, `dependency_checks`, `commands_run`, `validation_result`, `deployment_state_from_skills_list`, `supabase_registry_rows_updated`, `status`, and `remaining_unverified`.
