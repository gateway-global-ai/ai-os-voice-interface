---
document_id: AMD-2026-009-MERGE-DELTAS-FIRST-SLICE
parent_amendment: AMD-2026-009
parent_version: 0.1.5
version: 1.0.0
status: draft
category: operational_plan
title: Normative merge deltas (sanity-check) and first implementation slice
author: Gateway Global AIOS
created: 2026-04-03
last_updated: 2026-04-03
applied_normative_merge: 2026-04-03
related:
  - governing_docs/amendments/AMD-2026-009.md
  - governing_docs/amendments/AMD-2026-009-spec-merge-checklist.md
---

# AMD-2026-009 — Normative merge deltas (pre-apply sanity-check) + first implementation slice

**Purpose:** Part **A** lists **concrete spec deltas** keyed to [AMD-2026-009 §10](AMD-2026-009.md#10-cross-references-and-future-spec-deltas) *before* editing canonical files. Part **B** defines the **§4 gate** first product slice. **Apply only after Council ratification** and [spec-merge checklist](AMD-2026-009-spec-merge-checklist.md) §1.

---

## Part A — Merge delta sanity-check (by artifact)

### A.0 Repository reality (read this first)

| Expected path (checklist) | Status in this repo |
|---------------------------|---------------------|
| `governing_docs/specifications/GoogleWorkspaceIntegrationGovernance.md` (**AIOS-SPEC-007**) | **Present** (v0.1.0 draft, 2026-04-03). Earlier gap closed; expand with fuller upstream content if your org maintains a richer SPEC-007 elsewhere. |

**Note:** If a **canonical** SPEC-007 exists outside this repo, **merge** non-conflicting sections or add a pointer in §0 of the repository file.

---

### A.1 AIOS-SPEC-007 — Google Workspace integration (target file)

**Goal (AMD §10):** Web search as **policy-scoped** bridge; **search scope classes** referenced.

**Suggested placement:** New subsection (e.g. **“Web search and external retrieval”**) after the document’s integration / MCP routing overview — exact heading depends on final SPEC-007 outline.

**Normative bullets to add (paraphrase from AMD):**

1. **Workspace MCP** tools that invoke **Programmable Search Engine (PSE)** / Custom Search JSON API (**e.g.** `search_custom`) **SHALL** be **policy-scoped**: the effective **search scope class** (AMD-2026-009 §4) **SHALL** be determined by **intent → capability → policy**, not by ad hoc client parameters alone.
2. **SHALL** reference **POL-WEB-SCOPE-001** (or successor) for which scope classes are allowed per tenant / intent.
3. **SHALL NOT** treat **public web search** as an unconstrained default; **`web.search.broad_public`** **SHALL** follow AMD-2026-009 §4 trigger rules.
4. **Phase 1 continuity:** Bridge tools remain **server-side**; secrets (**`GOOGLE_PSE_*`**, etc.) **SHALL NOT** appear in browser bundles (align **WORKSPACE.md** operator notes).

**Cross-reference:** AMD-2026-009 §2 (out of scope: replacing entire SPEC-007).

---

### A.2 AIOS-SPEC-009 — `IntentPrimitiveAndExecutionModel.md`

**Goal (AMD §10):** **External knowledge** step in execution graph; **audit** linkage for plan/execution; **§7.1** non-executable paths.

**Where to patch:**

| Location | Delta |
|----------|--------|
| **§0 / cross_references** front matter | Add **AMD-2026-009** to `cross_references` / `amendment_history` when merged. |
| **§2 Scope — In scope** | Add bullet: **external knowledge acquisition** (bounded web retrieval + optional governed review) where **intent** references `web.*` capabilities, per **AMD-2026-009**. |
| **§15** (compilation / plan / execution) | Add **§15.8** (or extend **§15.2–15.3**): **External knowledge steps** — When a plan includes **web retrieval** or **governed website review**, the execution plan **SHALL** record: **search scope class**, **review mode** (snippet_only / result_set_review / page_review), **`retrieval_id`** (or equivalent), linkage to **AIOS-SPEC-010** envelope / **`review_files`** logical keys. |
| **Audit chain** | State explicitly that **retrieval → review → proposal** **SHALL** be joinable with **plan_id** / **execution_id** / product **auditId** (AMD-2026-009 §9). Extend **ExecutionPlan** / step metadata **MAY** include `externalKnowledge?: { retrievalId, scopeClass, reviewMode, reviewArtifactId? }` — exact schema **product-defined** but **SHALL** satisfy §9 minimum fields. |
| **§15.4–15.5** relationship | Cross-link **§7.1** AMD: invalid structured review or low confidence **SHALL NOT** auto-promote to executable write/send without gates. |

**Non-goals in merge:** Do not define PSE wire format; defer **capability string** table to implementation after POL-WEB registration.

---

### A.3 AIOS-SPEC-010 — `ExecutionScopeAndContextBounding.md`

**Goal (AMD §10):** **Normative** tie-in for **Execution Scope Envelope** + **web** logical resource keys (**§1.1**, **§6** AMD).

**Where to patch:**

| Location | Delta |
|----------|--------|
| **§4.1 Field semantics** — `scope.review_files` | Clarify that entries **MAY** be **repository paths** **or** **logical resource keys** for governed reads (e.g. **`web:pse:{engine_alias}:{query_fingerprint}`**, **`web:review:resultset:{retrieval_id}`**, **`web:review:page:{retrieval_id}:{index}`** per AMD-2026-009 §1.2). **SHALL NOT** bypass envelope validation. |
| **§5.2 Context bounding** | Add bullet: **Web retrieval / PSE** **SHALL** be bounded by the same envelope; **whole-web** or **unbounded** retrieval **SHALL NOT** be default context expansion — align language with AMD-2026-009 §6 and §11. |
| **§6 Relationship to Other Specifications** | Add row: **AMD-2026-009** — Web retrieval and governed review **SHALL** run inside an approved envelope; **search scope class** **SHALL** be **consistent** with **`review_files`** / logical keys (no parallel authority). |
| **§8 Compliance** | Optional bullet: conformance for components that emit **web** logical keys in **`review_files`**. |

**Non-goals:** Do not duplicate full **page_review** numeric caps (child spec / **POL-WEB-PAGE-001**).

---

### A.4 Policy register (organization index)

**Goal (AMD §4.1, §10):** Register **POL-WEB-SCOPE-001**, **POL-WEB-CONFIDENCE-001**, **POL-WEB-PAGE-001**; **default-deny** for **`web.search.broad_public`** unless explicitly allowed.

**Sanity-check:** Each ID **SHALL** have owner, effective date, and pointer back to **AMD-2026-009**. Provisional IDs **SHALL** be labeled until Council confirms names.

---

### A.5 WORKSPACE.md (informative)

**Goal (AMD §10):** Operator alignment; **no** secrets in **`VITE_*`**.

**Suggested edits:**

1. Short **“Governed web search (AMD-2026-009)”** subsection: PSE env on **MCP host**, **search scope classes** are **policy** (link amendment), **`broad_public`** non-default.
2. Keep **normative** force in specs; this file stays **informative**.

---

### A.6 Merge order (recommended)

1. Resolve **A.0** (SPEC-007 file presence or documented external canonical).  
2. **SPEC-010** (envelope keys — downstream specs depend on scope shape).  
3. **SPEC-009** (execution graph + audit).  
4. **SPEC-007** or **WORKSPACE.md** bridge text per A.1 / A.5.  
5. **Policy register** entries in parallel once IDs are confirmed.

---

## Part B — First implementation slice (checklist §4 gate)

**Binding references:** AMD-2026-009 §4 (scope classes), §5.1 (review modes), §7 (outcome contract), §7.1 (failure), §9 (audit), §11 (non-goals).

### B.1 Scope of the slice (what ships)

| Dimension | Choice for v1 slice |
|-----------|---------------------|
| **Retrieval** | **One** bounded path: PSE-backed **Custom Search** via existing MCP bridge (**e.g.** `search_custom` / workspace web search intent) with **one** fixed **search scope class** (recommend **`web.search.governance_corpus`** or **`web.search.approved_domains`** — **not** `broad_public`). |
| **Review** | **Only** **`result_set_review`** — structured artifact over the **returned result list** (AMD §5.1). **No** **`page_review`**, no extra HTTP fetch for review in v1. |
| **Envelope** | **SPEC-010:** plan step **SHALL** declare **`review_files`** logical keys for this retrieval + review (**`web:pse:…`**, **`web:review:resultset:{retrieval_id}`** per AMD §1.2). |
| **Downstream use** | **One** use case: e.g. **operator or primary** sees **structured relevance / suggested next step** that feeds **proposal** or **display only** — **no** automatic **write/send** without existing **§15** gates. |
| **Audit** | **Minimum §9 fields:** intent id, scope class, engine/config ref (alias, not raw key), query or hash, result indices reviewed, **`retrieval_id`**, **`plan_id`** joinability. |

### B.2 Explicitly deferred (not in v1 slice)

- **`page_review`**, link-following, second-hop fetch.  
- **`web.search.broad_public`** except in **policy-disabled** default builds.  
- **Crawl / deep research / arbitrary URL**.  
- Full **capability registry** strings — use **one** internal capability id + document as **provisional** until POL-WEB + registry updated.

### B.3 Acceptance criteria (for “slice complete”)

1. A **single** end-to-end demo path: **intent → retrieval → result_set_review artifact → audit record** **joinable** to plan execution.  
2. **§7.1** honored: schema failure → **non-executable** for automated downstream writes.  
3. **§11** non-goals: no browsing UX, no multi-page research session.  
4. Code review **references** this document + AMD-2026-009 **§4–§7** for reviewers.

---

## Automation hooks (future)

| Hook | Role |
|------|------|
| PR template for “AMD-2026-009 slice” | Requires checkbox: scope class fixed, `broad_public` off, `page_review` off. |
| Lint | `grep` for `broad_public` / `page_review` in new code paths without policy guard — flag in CI (informative first). |
| Spec diff | After merge, script verifies **AMD-2026-009** appears in SPEC-009/010 **cross_references** or **amendment_history**. |

---

*End of merge deltas and first-slice plan, version 1.0.0.*
