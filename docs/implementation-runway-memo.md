# Implementation runway — kernel-first conformance (execution memo)

**Purpose:** Turn ratified governing documents into **testable runtime behavior** on **live, high-risk surfaces** — not “implement amendment prose.” This memo fixes sequencing: **kernel conformance first**, then **Workspace**, then **expansion surfaces**.

**Sources:** Peer review on implementation runway; **AIOS-SPEC-009** (orchestration law), **AIOS-SPEC-007** (Workspace), **AMD-2026-009** / **AMD-2026-011** (when those product paths exist); **AMD-2026-010** remains **advisory / shadow** until evidence supports harder gates.

**Council pointer (governing repo, non-duplicative):** `aios-governing-docs/reference/implementation/AIOS-IMPLEMENTATION-RUNWAY-POINTER.md` (**AIOS-REF-013**).

---

## Normative precedence

1. **Governing documents** in **`aios-governing-docs`** are **authoritative** for requirements and definitions.
2. This memo is an **implementation and delivery planning** artifact for the product repo only.
3. If this memo and **ratified** specs/amendments disagree, **ratified governing text wins**; fix the memo or the code, not the law, unless following amendment process.
4. Product **acceptance criteria** should be **traceable to specific clauses** (section numbers, tables, or defined terms), not only to phase headings in this memo — so this document cannot drift into a shadow spec.

**Backlog discipline (avoid soft-spec drift):** The memo **organizes** work; **issues cite ratified clauses** in AC; **tests and evidence prove** those clauses; the memo is **never** the final authority for “done.”

**Issue template:** [`docs/templates/phase-1-conformance-issue.md`](templates/phase-1-conformance-issue.md) — use for each risky-path row (or cluster) so tickets stay concrete and clause-backed.

**Canonical filled example (pilot):** [`docs/conformance/pilot-issue-workspace-control-plane-call-graph.md`](conformance/pilot-issue-workspace-control-plane-call-graph.md) — Workspace control-plane call graph; use as the standard for clause-bound AC and evidence.

**Call-graph artifact (skeleton):** [`docs/conformance/artifacts/workspace-control-plane-call-graph.md`](conformance/artifacts/workspace-control-plane-call-graph.md) — fill from issue open; tracks entrypoints, boundaries, disclosure, fallbacks, bypass candidates, evidence.

---

## Principle

**Next sprint = close the gap between ratified contract and live runtime** on surfaces that can already violate it — starting from the **spine** (voice → intent → canvas → execution gate → Workspace → readiness / audit / trace), not from “pick a vertical.”

**SPEC-009** is **cross-cutting** (intent, temporal grounding, plan/proposal, approval, verification, promotion, disclosure/trace). It is **not** one option beside Workspace vs acquisition; it is the **binding behavior model** for the OS layer.

**UI conformance = governance conformance:** disclosure surfaces, session continuity, overlays, allowed views/fallbacks, and operator visibility must match spec minima — policy-correct code with misleading UI is still wrong.

---

## Phase 1 — Kernel conformance (do first)

| Track | Intent | Acceptance criteria (examples) |
|-------|--------|--------------------------------|
| **Intent loop** | Structured resolution; no silent generic-chat where governed disambiguation is required | Governed paths use `INTENT_JSON` / shared parser; audit on fallback where applicable (**pre-workplace Track B**); extend **`resolvedIntentRequiresLocalModel`** (and similar) from real execution policy |
| **Shell vs domain** | Deterministic split (**AMD-2026-007** / **SPEC-009 §2.1**) | Shell routing vs Workspace/skill execution does not blur in production paths |
| **Execution / mutation gate** | Governed actions go through plan + envelopes | Scope/mutation rules applied for all governed mutations; no bypass |
| **Transparency** | **SPEC-009 §12** minima on primary where policy threshold fires | **`spec009PrimaryDisclosure`** (and related) complete for lane, auth, adapter, capability; extend as intent resolution exposes “blocking” states |
| **Trace / operator** | Actor, lifecycle, system state, execution state visible per spec | Operator surfaces match **SPEC-009** / **SPEC-007** annex expectations; audit hooks consistent |

**Repos:** Primarily **`ai-os-voice-interface`**; specs remain canonical in **`aios-governing-docs`**.

---

## Phase 1 — Risky-path inventory (working)

High-risk paths are where runtime can diverge from ratified behavior **before** expansion work. Map each item to **specific SPEC/AMD clauses** in backlog issues; ownership is **primary file** for first review.

| Path / risk | Ratified hooks (examples) | Primary owner files | Backlog intent |
|-------------|---------------------------|---------------------|----------------|
| Intent resolution → silent generic chat or ungoverned fallback | **SPEC-009** (intent primitive, plan/proposal), **pre-workplace** Track B audit | `GovernanceCanvasContext.tsx`, `intentParse.ts`, `App.tsx` (agent pipeline) | Prove governed disambiguation; audit on fallback |
| Workspace MCP or tools **outside** integration control plane | **SPEC-007** (governed integration), **pre-workplace** Track C | `integrationControlPlane.ts`, `mcpAdapter.ts`, call sites | No bypass of `callWorkspaceMcpAdapter` for governed tools |
| **Shell vs domain** blur (routing, prompts, or UI) | **SPEC-009 §2.1**, **AMD-2026-007** (shell vs Workspace) | `workspaceIntentRouter.ts`, shell surfaces in `App.tsx`, `ShellIdentityBar.tsx` | Deterministic split in production paths |
| Primary **transparency** incomplete vs policy threshold | **SPEC-009 §12** (esp. **§12.2** PolicyRecord readiness) | `spec009PrimaryDisclosure.ts`, `ShellIdentityBar.tsx` | Disclosure matches lane, auth, adapter, capability when threshold fires |
| **`resolvedIntentRequiresLocalModel`** (and similar) not from real policy | **SPEC-009 §12.2** style disclosure | `App.tsx` (thread / execution policy), `ShellIdentityBar.tsx` | Wire from execution policy, not ad hoc |
| Operator / trace surfaces inconsistent with spec minima | **SPEC-009**, **SPEC-007** annex expectations | Audit hooks, operator UI routes | Actor, lifecycle, execution state visible per spec |

---

## Phase 2 — Workspace conformance

| Track | Intent | Acceptance criteria (examples) |
|-------|--------|--------------------------------|
| **Taxonomy** | Layer-1 / Layer-2 mapping complete | **SPEC-007** intent ↔ scope class; one intent → one scope class |
| **Control plane** | No MCP bypass | **`integrationControlPlane` → `callWorkspaceMcpAdapter`** only (**pre-workplace Track C**) |
| **Risk / failure** | Explicit handling | Adapter/auth/degraded states surfaced; failure policy deterministic |
| **Auth lifecycle** | GIS / token / reconnect | States enforced and disclosed |
| **Temporal bounds** | Retrieval scope | Email/calendar (etc.) bounded where spec requires |

**Repos:** **`ai-os-voice-interface`**, **`google-workspace-mcp`** (server behavior, env, OAuth), **`aios-governing-docs`** (reference only).

---

## Phase 3 — Expansion surfaces (after kernel + Workspace solid)

| Track | Gate |
|-------|------|
| **External knowledge / web** (**AMD-2026-009**) | Ship only when disclosure, grounding, provenance, and **SPEC-010** envelopes are solid |
| **External repo acquisition** (**AMD-2026-011** / **AIOS-SPEC-013**) | Quarantine, review, promotion, provenance flows ready — not before |

---

## Phase 4 — Enforcement hardening

| Track | Notes |
|-------|--------|
| **CI / governance integrity** | Already on governing repo; keep **G-7** stable (registry determinism, LF) |
| **Conformance tests** | Tie automated or manual checks to ratified clauses (**SPEC-009** conformance suite where adopted) |
| **Shadow / kernel pilot** (**AMD-2026-010**) | Promote only after evidence; remains non-blocking until then |

---

## Workstream map (repos)

| Repo | Role |
|------|------|
| **`aios-governing-docs`** | Canonical law; peer review; registry; **no runtime** |
| **`ai-os-voice-interface`** | Intent loop, shell, canvas, Workspace client, transparency UI, local lane |
| **`google-workspace-mcp`** | Governed tool plane, OAuth, MCP transport — must match **SPEC-007** server-side expectations |

---

## Already in flight (this codebase)

- Workspace **control plane** choke point and **WORKSPACE.md** alignment  
- **SPEC-009 §12.2**-oriented primary disclosure: **`src/compliance/spec009PrimaryDisclosure.ts`** + **`ShellIdentityBar`** (extend with **`resolvedIntentRequiresLocalModel`** from execution policy)  
- **Pre-workplace checklist** (`docs/pre-workplace-checklist.md`) for Phase 1 / Workspace PRs  

---

## Next actions (recommended order)

1. **Freeze** the risky-path inventory for this pass (edit only when you discover a new gap; avoid churn).  
2. **Open issues** from each row using [`docs/templates/phase-1-conformance-issue.md`](templates/phase-1-conformance-issue.md) — **AC must cite clauses**, not memo phases alone.  
3. **Trace Workspace governed path end-to-end** before behavior refactors: where actions are introduced, policy enforced, fallbacks can bypass governance, disclosure/trace drops, and any **raw-tool-dispatch** behavior vs **governed execution** (`integrationControlPlane` → `callWorkspaceMcpAdapter`).  
4. **Wire disclosure from policy:** **`resolvedIntentRequiresLocalModel`** (and similar) as **policy output** (provenance + reason/readiness) into **`ShellIdentityBar`** — **no inference in the shell**.  
5. **Phase 2** when Phase 1 exit criteria are met for the surfaces you ship.

---

*This memo is operational planning, not normative law; governing text remains in **`aios-governing-docs`**. See **Normative precedence** above.*
