---
document_id: AMD-2026-009-RATIFICATION-MOTION
subject_amendment: AMD-2026-009
subject_version: 0.1.4
motion_version: 1.0.0
status: draft
category: council_motion
title: Ratification motion — AMD-2026-009
author: Gateway Global AIOS
created: 2026-04-03
last_updated: 2026-04-03
execution_path: governing_docs/amendments/AMD-2026-009-spec-merge-checklist.md
---

# Ratification motion — AMD-2026-009

## Statement

Council is asked to **ratify** **[AMD-2026-009](AMD-2026-009.md)** at **version 0.1.4** (*Intent-Scoped Web Retrieval and Governed Website Review / External Knowledge Acquisition*), as the governing amendment for **bounded web retrieval and governed website review** in the AIOS stack, after **peer review Round 2** (triangulated) recorded on the amendment. *(Version 0.1.4 adds procedural links: spec-merge checklist and this motion; normative substance aligns with v0.1.2 editorial and Round 2 review.)*

## Scope (what this ratifies)

AMD-2026-009 **defines** governed **external knowledge acquisition**, including:

| Area | Summary |
|------|---------|
| **Intent-scoped search** | Search **scope classes** (policy), non-default **`web.search.broad_public`** with explicit triggers (§4). |
| **Bounded retrieval** | PSE (or equivalent) **under** **AIOS-SPEC-010** Execution Scope Envelope; **no** parallel bounding system (§1.1, §6). |
| **Structured review** | Review modes (**snippet_only**, **result_set_review**, **page_review**) with **§7** outcome contract and **§7.1** failure / low-confidence behavior. |
| **Explicit non-goals** | **No** general browsing, **no** crawling / scraping / deep research as authorized defaults, **no** arbitrary URL open outside §5.2 / §6 (§11). |

Normative propagation into **AIOS-SPEC-007**, **AIOS-SPEC-009**, **AIOS-SPEC-010**, the **policy register**, and informative **WORKSPACE.md** is specified in **§10** of the amendment.

## Authority (effect upon ratification)

Upon **approval**, the following **SHALL** apply:

1. **AMD-2026-009** becomes **ratified** governing text for this domain; repository state **SHALL** be updated per **Immediate actions** below.
2. **Normative merges** into the listed specs and policy artifacts **SHALL** be executed **only** according to  
   **[AMD-2026-009 spec-merge checklist](AMD-2026-009-spec-merge-checklist.md)**  
   (`governing_docs/amendments/AMD-2026-009-spec-merge-checklist.md`). That checklist is the **authorized execution path** from ratification → doctrine alignment → bounded implementation.

## Immediate actions (after approval)

| Step | Action |
|------|--------|
| 1 | **Amendment record:** Set **AMD-2026-009** `status` to **`ratified`** (or Council-equivalent), set **`ratification_target`** to the **ratification date** (ISO), update **`last_updated`**, and record this motion id / date in **`amendment_history`**. |
| 2 | **Checklist §1:** Complete **ratification prerequisites** (policy IDs, owning body, deferred capabilities explicit). |
| 3 | **Checklist §2:** Execute **normative merges** per target artifact (SPEC-007 / SPEC-009 / SPEC-010 / policy register / WORKSPACE.md). |
| 4 | **Checklist §3:** Preserve **non-goals** during merge (no browsing / crawl / arbitrary URL / unapproved code in merge PRs). |
| 5 | **Checklist §4:** Hold **first implementation** to the **single-path** gate (one retrieval path, one result-set review artifact, one downstream use case). |

## Deferred items (explicitly not blocking ratification)

- **`page_review` numeric limits** — **child spec** or implementation caps **after** ratification, per AMD-2026-009 §5.2 / §12.
- **Capability string binding** and router wiring — **deferred** to implementation specs **after** normative merges, as stated in AMD-2026-009 §5.

## Decision

| Option | Council use |
|--------|----------------|
| **Approve** | Ratify AMD-2026-009 v0.1.4; execute checklist as **Authority** above. |
| **Reject** | No normative merge under this motion; amendment remains **draft** until revised. |
| **Amend** | Council records conditions (e.g. textual edits, follow-up date); **SHALL** produce a revised amendment version or supplementary motion before merges proceed. |

---

*End of ratification motion — AMD-2026-009, motion version 1.0.0.*
