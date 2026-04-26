# AI OS Shell State Governance

## Status

Status: `review_pending`

This document governs the AI OS shell model for role journey, shell state, skill mapping, and bounded tool authority. It is not acceptance evidence for any runtime deployment until real command output, Supabase rows, and reviewer notes verify the implementation.

## Required Sources

- `skillshub` crate: https://crates.io/crates/skillshub
- `skillshub` repository: https://github.com/EYH0602/skillshub
- Rust `skills` crate: https://crates.io/crates/skills
- Rust `skills` docs: https://docs.rs/skills/latest/skills/
- Rust skills rule knowledgebase: https://github.com/leonardomso/rust-skills
- Cursor skills: https://cursor.sh/docs/skills
- VCU identity alignment amendment: `governing_docs/amendments/AMD-2026-010.md`
- AI OS shell authority implementation: `src/shell/shellAuthority.ts`
- AI OS intent ingestion: `src/shell/IntentIngestionController.ts`
- AI OS shell navigation apply path: `src/shell/shellNavigationApply.ts`
- AI OS prompt contract: `src/shell/shellPromptContract.ts`
- AI OS skill authority gate: `src/shell/skillIntentAuthority.ts`

## Governing Principle

AI OS does not treat a system prompt as sufficient authority. A role must enter a shell state, the shell state must map to approved skills, and those skills must map to bounded tools before an agent can perform privileged work.

The required chain is:

`role journey -> shell state -> allowed skills -> allowed tools -> bounded actions -> real evidence`

Breaking this chain creates the failure mode AI OS exists to prevent: an LLM with confusing or excessive instructions and unrestricted tools. That is a security risk and an economic problem because broad authority increases wasteful tool calls, irrelevant context loading, and accidental work outside the user's intent.

## Role Journey and Shell State

The shell owns state transitions. Agents may request state changes, but the shell decides whether the transition is allowed. Existing surface-mode authority is implemented in `src/shell/shellAuthority.ts`; skill/tool authority is implemented by `src/shell/skillIntentAuthority.ts`.

Shell state is not just presentation. It is an operating boundary:

- It determines which role the agent is acting as.
- It determines which skills are relevant.
- It determines which tool classes are available.
- It determines what evidence is required before escalation.
- It denies actions where role, scope, prompt, skill, and tools do not align.

## Skill and Tool Mapping

`skillshub` makes skill authority machine-readable through `SKILL.md` frontmatter:

```yaml
---
name: skill-name
description: What this skill does
allowed-tools: Tool1, Tool2
license: MIT
metadata:
  author: my-org
  version: "1.0"
---
```

AI OS uses `allowed-tools` as an input to the permission gate. If a skill does not list a tool, the shell must not assume that tool is allowed. If a shell state denies a class such as `database` or `shell`, a skill cannot grant that class on its own.

## Policy Table

| Shell state | Role | Allowed skills | Allowed tool classes | Denied tool classes | Evidence before escalation |
|---|---|---|---|---|---|
| `guest` | Visitor | Public intro and account-entry skills | `read` | `write`, `execute`, `database`, `shell`, `network`, `browser`, `mcp` | Account verification or explicit shell transition. |
| `primary` | Authenticated user | User-facing VCU, knowledge, and read-only workspace skills | `read`, `browser` | `database`, `shell`, `execute`, `mcp` | Authenticated session and skill-specific `allowed-tools`. |
| `developer` | Developer operator | Rust, Cursor, skill registry, validation, and approved install-planning skills | `read`, `write`, `execute`, `shell`, `network` | `database` by default | Interim developer authority plus real command evidence. |
| `operator` | Operator | Diagnostics, registry administration, Supabase registry, and deployment evidence skills | `read`, `write`, `execute`, `shell`, `database`, `network`, `mcp` | Destructive actions without approval | Operator authority and real command/database evidence. |
| `coding_agent` | Coding agent | Project-scoped coding and review skills | `read`, `write`, `execute`, `shell`, `network` | Unscoped database/admin tools | Project baseline, role match, dry-run where available, and command evidence. |
| `skill_registry` | Skill curator | `skillshub`, `skills`, Rust skills registry, and Cursor skill catalog skills | `read`, `network`, `shell` | `database` unless operator-approved | `skillshub info`, `skillshub agents`, `skillshub doctor`, or blocked/unverified status. |

## Prompt Authority Boundary

Traditional system prompts can be overpowered by users or confused by excessive tool access. AI OS reduces that risk by requiring prompt claims to match shell authority:

- A prompt saying "you are an operator" is insufficient without operator shell state.
- A skill declaring `allowed-tools: Shell` is insufficient if the current shell state denies shell tools.
- A user request to "use every tool" is denied unless the role, shell state, skill metadata, and evidence requirements allow it.
- A registry row saying a skill is available is not proof that it is installed or linked.

## Platform Economics

Bounded authority improves platform economics:

- Fewer unnecessary tool calls.
- Smaller context loads.
- Lower chance of rework from confused prompts.
- Clearer routing from voice intent to skill execution.
- Less time spent inventing new skills when a verified skill or tap already exists.
- Lower security overhead because scope is declared and auditable.

Efficiency comes from matching the smallest capable skill set to the user's current intent. The shell should not expose broad authority "just in case."

## Evidence Requirements

AI OS must record real evidence before changing status:

- `skillshub` install/link/discovery state requires real `skillshub` command output.
- Rust `skills` validation/sync state requires real `skills` command output.
- Supabase registry writes require actual row counts and query verification.
- Build/test claims require actual command output.
- Missing tools, missing repos, missing auth, or unavailable commands must be marked `blocked` or `unverified`.

## No-Mock Gate

Do not create or accept mock installs, fake skill lists, simulated exit codes, placeholder authority, fabricated prompt reviews, or claimed shell-state transitions without evidence. The correct status for missing proof is `blocked` or `unverified`.
