# Pre–Workplace Phase 1 gate

Branch- and phase-specific merge criteria. Satisfy this checklist before treating **Workplace Phase 1** (read-plane Workspace MCP) as **live** or **production-ready**.

## Usage

This checklist **must** be satisfied before:

- merging Phase 1 Workspace MCP work that affects production readiness
- marking Workspace integration as **live**
- exposing Workspace features in **production** builds

Pull requests that touch Workspace integration **should** reference this document and state pass/fail against each track (or N/A with reason). The default **[`.github/pull_request_template.md`](../.github/pull_request_template.md)** includes optional checkboxes for this gate.

---

## Track A — Secret boundary

**Blocker** until one of: a production-safe secret boundary **or** an explicit documented demo-only exception.

| Item | Pass / fail |
|------|-------------|
| **`vite.config.ts`** — `define` inlining of `GEMINI_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` | **Pass:** Production build does not ship long-lived provider secrets in client JS, **or** production deploy is explicitly disabled / gated. **Fail:** Public deploy inlines those keys with no documented exception. |
| **`src/App.tsx`** — `GoogleGenAI({ apiKey: … })` | Same trust boundary as above. |
| **`src/api/llmHealth.ts`** | Comments and behavior match the chosen model (no contradictory “safe for prod” if keys are client-only). |
| **`.env.example`** | States which vars are unsafe for a **public** production frontend; points to proxy/token path if applicable. |
| **`README.md`** | Short note on demo-only vs production (see repo root README). |

**Explicit mode requirement:** If client-side provider keys remain supported for local development, the build/runtime must make that mode **explicit** and **non-default** for production (e.g. documented demo-only default; production requires a different pipeline or server-held secrets).

---

## Track B — Structured intent for governed navigation

**Blocker** for routing that affects mode, canvas, workspace, or governance UI.

| Item | Pass / fail |
|------|-------------|
| **`src/App.tsx`** — voice / DISC / system overlays | **Pass:** `AppMode` / overlay transitions driven by **`INTENT_JSON`** (or a single shared parser), not by substring checks on free agent text. **Fail:** Production routing depends on `agentText.includes("…")` for those transitions. |
| **`src/governance/intentParse.ts`** | Extend with **`app.*`** (or equivalent) intents using the same `INTENT_JSON:` mechanism; align `legacyPhraseParse` with policy (remove, dev-only gate, or document). |
| **Audit** | When fallback or legacy parse is used, emit **`intent_fallback_used`** (or equivalent) so behavior is observable. |

**Grep / assert (literal pass/fail):**

- **Pass:** No production routing path for **governed UI** (voice options, DISC, system config, governance/workspace navigation) depends on `agentText.includes(` for **mode or overlay selection**.
- **Fail:** Any such `includes(` remains the sole trigger for those transitions in production code paths.

Suggested verification:

```bash
rg 'agentText\.includes\(' src/App.tsx src/governance/
```

— review each hit; governed transitions must be keyed off structured intent, not phrase matching. **Note:** `src/governance/intentParse.ts` `legacyPhraseParse` retains phrase `includes` for **development** demo/fallback only (`import.meta.env.PROD` short-circuits to `null`); production builds do not use phrase matching for governance intents. Production paths for mode, workspace, and governance **canvas** navigation still go through **`INTENT_JSON`** (with `intent_fallback_used` audit when legacy is used in dev).

---

## Track C — No Workspace bypasses

| Item | Pass / fail |
|------|-------------|
| **`src/workspace/integrationControlPlane.ts`** | Remains the choke point that calls `callWorkspaceMcpAdapter`. |
| **`src/overlays/WorkspaceHubSurface.tsx`** (and other UI) | No direct `fetch` to Workspace MCP URL; no parallel MCP client. |

**Verify:**

```bash
rg 'callWorkspaceMcpAdapter|VITE_WORKSPACE_MCP_URL' src/
```

— adapter calls only from control plane / `mcpAdapter`; env used for configuration, not ad hoc calls from random components.

---

## PR-level acceptance (minimum bar)

1. **Secret handling decision is explicit** — README + `.env.example` + consistent code commentary.
2. **Core governed UI paths** — structured intent only for routing (Track B); grep/assert satisfied.
3. **Workspace** — no bypass of control plane → adapter → audit (Track C).

---

## Non-goals (do not block Phase 1 proof)

- `App.tsx` / `AppImpl` decomposition into hooks
- Moving inline overlays to separate files
- PCM / Web Audio refinements

Schedule these after the first read-plane proof.

---

## Related docs

- [README.md](../README.md) — secrets note and pointer here
- [WORKSPACE.md](../WORKSPACE.md) — runtime integration, adapter, `VITE_WORKSPACE_MCP_URL`
- [AIOS-SPEC-008](../governing_docs/specifications/IntentDiscoveryOnboardingFramework.md) — unknown intent, discovery, and onboarding policy when PRs touch intent classification or new surfaces
- [workspace-gmail-read-qa.md](./workspace-gmail-read-qa.md) — when PRs implement Gmail/Mail MCP read-plane (`workspace.mail.*`)
