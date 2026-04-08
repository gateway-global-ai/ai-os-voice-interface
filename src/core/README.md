# `src/core` — shell / control-plane contracts (proposed ADR-001)

This directory holds **runtime law** modules that **must not** import React or UI components.

**Baseline vs product:** The **AI OS shell baseline** is **kernel + shell law** (this tree + `src/shell/` orchestration). **Workspace MCP, Google integrations, and non-shell agents** belong in **downstream** layers; they must not redefine shell semantics. See `docs/implementation/AIOS-IMPLEMENTATION-CONTROL-PROGRAM.md` (**Binding intent and outcome**).

- **AIOS-ADR-001** (proposed, pending council): `aios-governing-docs/reference/implementation/ADR-001-core-shell-vs-interface-boundaries.md`
- **Master program:** `aios-governing-docs/reference/implementation/AIOS-MASTER-IMPLEMENTATION-PROGRAM.md` (**AIOS-MASTER-IMPL-001**)

| Area | Path |
|------|------|
| Shell outcomes / session entry | `src/core/shell/` (re-exported from `src/shell/` where needed) |
| Workspace gate **type** | `src/core/types/workspaceState.ts` |
| SPEC-009 §12.2 **predicates** | `src/core/compliance/spec009DisclosurePredicates.ts` |
| Local interpretation **policy** (POL-MODEL / §12.2) | `src/core/policy/localInterpretationRequired.ts` |
| Disclosure **presentation** (strings) | `src/compliance/spec009PrimaryDisclosure.ts` → uses `shell/shellSurfaceLabels` |

`src/shell/` may re-export from `src/core/shell/` for backward compatibility during migration; **new** shell law belongs under **`src/core/`** first.
