---
review_id: REV-AMD-2026-009-001
document_reviewed: amendments/AMD-2026-009.md
document_version: 0.1.1
reviewer: DeepSeek R3
review_date: 2026-04-06
review_round: 1
review_type: technical
disposition: approved_with_minor_revisions
composite_score: 4.1
---

# Peer Review: AMD-2026-009 — Intent-Scoped Web Retrieval and Governed Website Review

## Grading Scorecard

| # | Dimension | Score (1-5) | Key Finding |
|---|-----------|:-----------:|-------------|
| 1 | Cross-Document Consistency | 4 | SPEC-007/009/010 cross-references are coherent; policy register IDs (`POL-WEB-SCOPE-*`) still placeholders pending ratification. |
| 2 | Business Model Alignment | 4 | External knowledge stays tenant-scoped and cost-tiered; no marketplace drift. |
| 3 | Legal Enforceability | 3 | Binding **SHALL** language is present; fine-grained liability for third-party web content remains delegated to MPOA / product terms (acceptable at amendment outline stage). |
| 4 | Architectural Fidelity | 5 | **§1.1** correctly subordinates “search scope class” to **SPEC-010** — avoids a parallel bounding system. |
| 5 | Completeness | 4 | Outcome contract, review modes, and audit linkage are specified; JSON schema for §7 fields deferred — note for Round 2. |
| 6 | Conflict Freedom | 5 | No contradiction with intent/scope doctrine; non-goals (§11) guard against “AI browser” misread. |
| 7 | Practical Operability | 4 | Implementers need a worked example of **logical resource keys** for PSE query windows in `review_files` (add in spec delta or appendix). |
| 8 | Style & Clarity | 4 | Dense but consistent; table in §5.1 aids implementation. |
| 9 | Developer Synchrony | 4 | Capability strings deferred explicitly; router wiring called out for post-ratification. |
| 10 | Platform Economics Synchrony | 4 | Token policy and snippet-only default align with cost discipline. |
| 11 | Friction Factor | 4 | Reasonable governance overhead for high-risk `broad_public`; triggers (a)/(b)/(c) are auditable. |
| | **Composite Score** | **4.1** | |

---

## Overall Assessment

### Strengths

1. **SPEC-010 integration (§1.1, §6):** Eliminates ambiguity that web retrieval could bypass execution scope — critical for reviewers who look for parallel authority.
2. **`web.search.broad_public` triggers:** Deterministic (a)/(b)/(c) removes “policy-gated” hand-waving.
3. **§5.1 review modes:** Clear ladder from snippet-only to page review without authorizing crawling.
4. **§7.1 failure behavior:** Non-executable default on schema failure closes an automation hole.

### Minor revisions (before merge to specs)

1. **Resource key examples:** Add one non-normative example in §1.1 or §10 (e.g. `web:pse:{cx_hash}:{query_window_id}`) so implementers align with SPEC-010 virtual paths.
2. **Confidence thresholds:** §7.1 references “policy thresholds” — reserve a **POL-WEB-CONFIDENCE-001** or cite policy register row in §10 table.

### Disposition

**approved_with_minor_revisions** — safe for Round 2 consolidation and spec delta drafting.
