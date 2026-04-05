---
document_id: AMD-2026-009-SPEC-MERGE-CHECKLIST
parent_amendment: AMD-2026-009
parent_version: 0.1.3
version: 1.0.0
status: draft
category: operational_checklist
title: Normative spec-merge checklist (AMD-2026-009 §10)
author: Gateway Global AIOS
created: 2026-04-03
last_updated: 2026-04-03
related:
  - governing_docs/amendments/AMD-2026-009.md
  - governing_docs/specifications/GoogleWorkspaceIntegrationGovernance.md
  - governing_docs/specifications/IntentPrimitiveAndExecutionModel.md
  - governing_docs/specifications/ExecutionScopeAndContextBounding.md
  - WORKSPACE.md
---

# Normative spec-merge checklist — AMD-2026-009 (§10)

**Purpose:** Bridge **Council ratification** → **normative merges** across SPEC-007 / SPEC-009 / SPEC-010 / policy register / informative repo notes → **bounded first implementation**, without inconsistent deltas.

**Authority:** Grounded in [AMD-2026-009 §10](AMD-2026-009.md#10-cross-references-and-future-spec-deltas) and supporting sections (§1.1–§1.2, §4.1, §5–§7, §9, §11).

**Canonical paths in this repository (merge targets):**

| Doc ID | File |
|--------|------|
| AIOS-SPEC-007 | `governing_docs/specifications/GoogleWorkspaceIntegrationGovernance.md` |
| AIOS-SPEC-009 | `governing_docs/specifications/IntentPrimitiveAndExecutionModel.md` |
| AIOS-SPEC-010 | `governing_docs/specifications/ExecutionScopeAndContextBounding.md` |
| Informative | `WORKSPACE.md` (repository root) |
| Policy register | *Organization master policy index* (not necessarily in-repo; see §2.4) |

---

## 1. Ratification prerequisites

Complete **before** editing normative specs for this amendment.

- [ ] **AMD-2026-009** `status` updated from `draft` to **`ratified`** (or the status your Council process uses for approved amendments).
- [ ] **`ratification_target`** set per process (e.g. ISO **ratification date**), and **`last_updated`** refreshed on the amendment.
- [ ] **Policy IDs:** **POL-WEB-SCOPE-001**, **POL-WEB-CONFIDENCE-001**, **POL-WEB-PAGE-001** either **confirmed** in the master policy index or explicitly **provisional** with a dated **follow-up** ticket and owner (AMD-2026-009 §4.1).
- [ ] **Owning body** for each merge target recorded **canonically** (AMD-2026-009 §10: Council **SHALL** record owning body — illustrative table is not sufficient post-ratification).
- [ ] **Capability strings** and router wiring: if still deferred, **state** that in SPEC-009 / policy notes so merge does not imply false completeness (AMD-2026-009 §5).

---

## 2. Normative merges by target artifact

Keyed to **AMD-2026-009 §10** table. Each row: merge **normative** paragraphs; add **`amendment_history`** (or equivalent) on the target doc per your governance convention.

### 2.1 AIOS-SPEC-007 (Workspace / integration bridge)

- [ ] **Web search** described as **policy-scoped** bridge (not a raw “search the internet” affordance).
- [ ] **Search scope classes** (AMD-2026-009 §4) **referenced** so integration routing aligns with policy, not only MCP mechanics.
- [ ] **Phase 1** continuity: **workspace.web.search** / MCP bridge remains consistent with AMD-2026-009 §2 (out of scope: replacing SPEC-007 wholesale).

### 2.2 AIOS-SPEC-009 (execution graph, audit)

- [ ] **External knowledge** step in the **execution graph** where **intent** references `web.*` capabilities (AMD-2026-009 §10).
- [ ] **Audit linkage** fields for **retrieval → review → proposal**: joinable **plan_id** / execution / step correlation per product audit model (AMD-2026-009 §9).
- [ ] **§7.1** behavior reflected where **automated** execution must not consume invalid structured review or low-confidence paths without gates.

### 2.3 AIOS-SPEC-010 (scope envelope)

- [ ] **Normative** tie-in: **Execution Scope Envelope** carries **web retrieval** and **review** logical resource keys (AMD-2026-009 §1.1, §6).
- [ ] **Exemplar** key patterns aligned with §1.2 (`web:pse:…`, `web:review:resultset:…`, `web:review:page:…`) as **illustrative** where SPEC-010 defines **`review_files`** / read surfaces.
- [ ] **No parallel bounding:** search scope class **SHALL NOT** override envelope validation (§1.1).

### 2.4 Policy register

- [ ] **POL-WEB-SCOPE-001** — search scope class registry + default-deny for **`web.search.broad_public`** unless explicitly allowed (§4.1).
- [ ] **POL-WEB-CONFIDENCE-001** — thresholds for §7 / §7.1 non-executable and human/operator gates.
- [ ] **POL-WEB-PAGE-001** — opt-in and limits for **`page_review`** (§5.2); numeric caps **MAY** remain “by implementation” or **child spec** if not yet fixed.

### 2.5 WORKSPACE.md (informative only)

- [ ] **Operator** notes: PSE / **GOOGLE_PSE_*** (or equivalent) **server-side** on MCP host; **no** `VITE_*` or client-bundle secrets for API keys (AMD-2026-009 §10, §2).
- [ ] Explicitly **informative** — no new normative law here; alignment pointers to SPEC-007 / SPEC-009.

---

## 3. Non-goals to preserve during merge

Do **not** accidentally expand scope while merging text.

- [ ] **No** normative endorsement of **broad browsing** or **quasi-browser** behavior.
- [ ] **No** crawling, scraping pipelines, ranking/SEO, or **multi-page deep research** as authorized defaults (AMD-2026-009 §11).
- [ ] **No** **arbitrary URL open** outside §5.2 / §6 bounded rules.
- [ ] **No product code** in the spec-merge PR **unless** separately approved (merge step = doctrine only).

---

## 4. Post-merge implementation gate

First product slice **after** normative merges **SHALL** stay narrow (prevents doctrine drift).

- [ ] **One** intent-scoped **web retrieval** path.
- [ ] **One** structured **result-set review** artifact (§7).
- [ ] **One** downstream **action / proposal** use case wired through audit (§9).
- [ ] **Deferred:** broad browsing, **page_review** surface expansion, multi-path retrieval — until a later approved phase (optional **child spec** for **page_review** numeric limits post-ratification).

---

## 5. Future automation (process improvement)

These steps are **manual** today; they are candidates to **encode** so governance tends toward repeatable, verifiable workflows.

| Opportunity | Intent |
|-------------|--------|
| **Checklist ↔ PR labels** | Apply `spec-merge:amd-2026-009` (or equivalent) on PRs that touch listed files; CI or bots **refuse** merge if required checklist sections are unchecked (human attestation in PR body). |
| **Cross-doc linkage** | On amendment `ratified`, generate or validate that **amendment_history** on SPEC-007/009/010 references **AMD-2026-009** and date (script over `governing_docs/specifications/*.md`). |
| **Policy ID lint** | When **POL-WEB-*** appear in specs, require a matching row in the **exported** policy register (JSON/YAML) if the org maintains one outside git. |
| **Non-goal grep** | Optional CI: flag new normative language in SPEC-007/009/010 that matches deny patterns (“browse any”, “open any URL”, “crawl”) unless paired with AMD-2026-009 §5–§6 qualifiers. |
| **Implementation gate** | Issue templates for “first slice” **MUST** link this checklist §4; release automation **MUST NOT** tag a release “web governance complete” without Council-defined criteria. |
| **Council motion → state machine** | Store `status`, `ratification_target`, and `peer_review` in structured form; webhook or scheduled job opens “spec-merge” tasks when transition **draft → ratified** is recorded. |

*Automation should augment human judgment, not skip Council or architecture review.*

---

*End of AMD-2026-009 spec-merge checklist, version 1.0.0.*
