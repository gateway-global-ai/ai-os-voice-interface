---
name: skillshub-authority-manager
description: Manages skillshub taps, skill discovery, agent linking, allowed-tools metadata, and AI OS shell role/scope/tool authority gates.
allowed-tools:
  - ReadFile
  - Glob
  - rg
  - WebFetch
  - WebSearch
  - Shell
license: Apache-2.0
metadata:
  author: Gateway Global AI
  version: "1.0"
---

# Skillshub Authority Manager

## Trigger Scenarios

Use when the user asks to install or manage `skillshub`, add a skill tap, discover skills, inspect `SKILL.md` metadata, link skills to agents, enforce `allowed-tools`, or map shell state to skill/tool authority.

## Required Sources

- `skillshub` crate: https://crates.io/crates/skillshub
- `skillshub` repository: https://github.com/EYH0602/skillshub
- Rust `skills` crate: https://crates.io/crates/skills
- Rust skills rule knowledgebase: https://github.com/leonardomso/rust-skills
- Cursor skills: https://cursor.sh/docs/skills
- AI OS shell governance: `docs/vcu/ai-os-shell-state-governance.md`
- AI OS skill authority gate: `src/shell/skillIntentAuthority.ts`

## No-Mock Gate

No mock tap discovery, fake installed skill state, fabricated linked agents, simulated command output, placeholder `allowed-tools`, or invented authority decisions. If `cargo`, `skillshub`, a tap repository, or a target agent directory is unavailable, mark the status `blocked` or `unverified`.

## May Change

- Skillshub registry docs, reports, and review-stage Supabase rows.
- AI OS skill authority guidance and source-backed registry importers.
- Local skill source folders only when explicitly requested and validated.

## May Not Change

- Do not run destructive `skillshub clean` commands without explicit approval.
- Do not run install/link/update commands without recording real command output.
- Do not grant a tool because a user requested it; the shell state, role, skill metadata, and authority profile must allow it.
- Do not store secrets, private paths, or full private logs in public Supabase rows.

## Workflow

1. Verify current tool availability with real commands such as `cargo --version` and `skillshub --version` or `skillshub --help`.
2. Inspect the relevant tap or `SKILL.md` source before adding it to the registry.
3. Extract `name`, `description`, `allowed-tools`, `license`, `metadata.author`, and `metadata.version` when present.
4. Evaluate the role/scope/tool request against `src/shell/skillIntentAuthority.ts`.
5. Prefer diagnostic commands first: `skillshub doctor`, `skillshub agents`, `skillshub info`, and `skillshub external scan`.
6. Use `skillshub link` only after confirming the target shell role has the necessary authority and the user approved linking.
7. Record command, cwd, exit code, and output summary; mark missing evidence `blocked` or `unverified`.

## Output Contract

Return `tap_or_skill`, `sources_checked`, `allowed_tools`, `role_scope_authority`, `commands_run`, `agent_link_state`, `authority_decision`, `status`, and `remaining_unverified`.
