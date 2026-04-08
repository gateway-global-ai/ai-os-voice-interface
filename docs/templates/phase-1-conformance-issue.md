# Phase 1 conformance issue (clause-backed)

Use this template for tickets opened from the **Phase 1 — Risky-path inventory** in [`docs/implementation-runway-memo.md`](../implementation-runway-memo.md). Copy into GitHub (or your tracker) and fill every section.

**Discipline:** The memo **organizes** work; **acceptance criteria and “done”** must cite **ratified governing clauses** (and tests/evidence prove those clauses). The memo is **not** the authority for whether behavior conforms.

---

## Title

`[Conformance][Phase 1] <short surface or risk> — <clause ref>`

Example: `[Conformance][Phase 1] Workspace MCP call path — AIOS-SPEC-007 + control plane`

---

## Metadata

| Field | Value |
|--------|--------|
| **Risky-path row** | (paste or paraphrase one row from the memo table, or “cluster: …”) |
| **Risk level** | Low / Medium / High / Critical |
| **Blocks Phase 2?** | Yes / No — (why in one line) |
| **Primary owner (role or person)** | |
| **Owner files (first review)** | e.g. `src/workspace/integrationControlPlane.ts`, … |
| **Conformance status** | `Unknown` / `Partially conformant` / `Non-conformant` / `Conformant with evidence` — update as investigation progresses; do not collapse progress into open/closed alone. |

---

## Clause anchors (mandatory before issue is active)

An issue is **not active** until this table is complete: **exact** `document_id`, **exact** section number (or numbered list item), and **one-line clause intent** being proven — not “SPEC-009 §12” alone. **No** “close enough” citations; the pilot sets the standard.

| document_id | Section / item | Clause intent (what this issue proves or disproves) |
|-------------|----------------|-----------------------------------------------------|
| | | |

**Required for Workspace / control-plane issues:** Create or link a **call-graph artifact** skeleton under `docs/conformance/artifacts/` **when the issue opens** (not only at close). See pilot: [`conformance/artifacts/workspace-control-plane-call-graph.md`](../conformance/artifacts/workspace-control-plane-call-graph.md).

---

## Failure mode if non-conformant

What goes wrong in production if this item fails (security, trust, or operator blindness). Makes risk concrete for prioritization and review.

Examples: raw adapter execution outside policy; disclosure missing while execution still proceeds; shell showing policy-derived state it never received; governed path falling back to unguided generic behavior without an explicit, ratified outcome.

---

## Surface / path

Describe the **user- or agent-visible surface** and the **code path** (entry → routing → policy → execution → disclosure), enough that another engineer can reproduce the scenario.

---

## Governing clause(s) — required

List **specific** ratified references. Prefer section numbers, tables, or defined terms.

| Document | Clause / section | What it requires (one line each) |
|----------|-------------------|----------------------------------|
| e.g. AIOS-SPEC-009 | §12.2 | … |
| e.g. AIOS-SPEC-007 | … | … |

If pre-workplace checklist applies, cite it as **supporting** process, not as a substitute for SPEC/AMD clauses.

---

## Current behavior

What happens **today** (facts: logs, screenshots, code pointers). No “should.”

---

## Required behavior

What must be true for **conformance** to the clauses above. Still tied to those clauses, not to the memo’s phase slogans alone.

---

## Acceptance criteria

Bullet list; **each bullet must map to a clause** (reference the table above).

- [ ] … (SPEC-009 §…)
- [ ] …

---

## Evidence / tests required

Classify each reference as one of: **code** (static review, grep), **test** (automated), **runtime observation** (logs, audit, traces), **UI observation** (screens, manual). **Do not** treat UI-only behavior as proof of control-plane or policy conformance; pair UI claims with code/test/runtime proof where the clause requires it.

- Automated: (test file / assertion id / scenario)
- Manual / operator: (steps, expected visible state)
- Trace / audit: (what is logged or disclosed, per spec)

**Anti-pattern:** UI-only checks that could pass while policy is wrong — especially for disclosure and execution gates.

---

## Policy vs UI (when applicable)

For flags such as **`resolvedIntentRequiresLocalModel`**:

- **Shell/UI** must consume a **resolved policy outcome** (provenance + reason / readiness), not infer policy locally.
- State **where** that outcome is produced (e.g. execution policy / thread summarize), not only where it is displayed.

---

## Control-plane / call graph (Workspace-related items)

Before refactoring or expanding UI, complete this when the path touches Workspace tools:

- [ ] **Introduction:** Where are governed action / intent IDs fixed for this path?
- [ ] **Policy:** Where are risk class and policy enforced?
- [ ] **Bypass:** Where can fallback skip governance (generic chat, raw MCP, silent noop)?
- [ ] **Trace / disclosure:** Where can trace or disclosure state be dropped or transformed incorrectly?
- [ ] **Dispatch model:** Does any segment still behave like **raw tool dispatch** instead of **governed execution**?

Attach a short **call graph** (list or diagram) from entry to `integrationControlPlane` → `callWorkspaceMcpAdapter` (or document why this item is out of scope for that chain).

---

## Out of scope / dependencies

Other tickets, specs pending ratification, or explicit waivers (with council/amendment reference if any).

---

## Done definition

**Done** = clauses in **Governing clause(s)** are satisfied and **Evidence / tests** passes. The memo row is **index only**, not the legal bar.
