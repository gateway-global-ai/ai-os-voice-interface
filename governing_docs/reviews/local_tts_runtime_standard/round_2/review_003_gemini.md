review_id: REV-LOCAL_TTS_RUNTIME_STANDARD-001
document_reviewed: LOCAL_TTS_RUNTIME_STANDARD
document_version: 0.1.0
reviewer: Gemini
review_date: 2026-04-05
review_round: 2
review_type: legal
disposition: major_revision_required
composite_score: 2.5
---

# Peer Review: Local Text-to-Speech (TTS) Runtime Standard

## Grading Scorecard

| # | Dimension | Score (1-5) | Key Finding |
|---|-----------|:-----------:|-------------|
| 1 | Cross-Document Consistency | 2 | References are invalid, and the document fails to adhere to foundational Style Guide requirements. |
| 2 | Business Model Alignment | 4 | The standard correctly supports the enterprise need for data sovereignty, which is a key business driver. |
| 3 | Legal Enforceability | 1 | The document's core terms are undefined, and it specifies no consequences for non-compliance, making it legally toothless. |
| 4 | Architectural Fidelity | 4 | The concept of policy-gated lanes for local vs. remote compute aligns strongly with the Technical Manifesto. |
| 5 | Completeness | 2 | Fails to define its most critical terms ("sovereign," "trust zone") and omits remedies for violations. |
| 6 | Conflict Freedom | 3 | While not in direct conflict, the vague data handling rules create tension with the MPOA's strict data sovereignty guarantees. |
| 7 | Practical Operability | 2 | Ambiguous states like "degraded" and undefined terms like "sovereign claim" make the standard impossible to implement consistently. |
| 8 | Style & Clarity | 2 | The document violates multiple Style Guide rules on structure, formatting, and terminology, reading more like a draft note than a standard. |
| 9 | Developer Synchrony | 3 | Provides a reasonable high-level overview for a developer but lacks the specific details needed for robust implementation. |
| 10 | Platform Economics Synchrony | 3 | The standard is economically neutral; it neither conflicts with nor reinforces the MPOA's economic model. |
| 11 | Friction Factor | 4 | The requirements are proportional to the claims being made and do not introduce unnecessary bureaucracy. |
| | **Composite Score** | **2.5** | |

---

## Overall Assessment

This document attempts to solve a critical governance problem: defining the operational requirements for a "local-first" or "sovereign" voice capability. However, it is a draft in the truest sense of the word. While its architectural concepts are sound and align with the platform's principles, it fails on nearly every measure of legal and operational rigor.

### Strengths

-   **Architectural Alignment (Section 4, 7):** The standard correctly establishes the concept of distinct, policy-gated "lanes" for local and remote TTS. The fallback logic—blocking or proposing remote TTS rather than failing silently—is a strong, deterministic pattern that aligns perfectly with the Technical Manifesto.
-   **Business Alignment (Section 2):** By tying strict technical requirements to specific marketing or product claims ("sovereign," "local-first"), the document correctly links the platform's technical guarantees to its enterprise value proposition.

### Critical Gaps

-   **Lack of Legal Enforceability:** The document is riddled with undefined terms that would be immediately challenged in arbitration. Words like "sovereign," "local-first," and "trust zone" have significant legal implications but are used without formal definition. There are no specified remedies or consequences for violating the standard, rendering it a set of suggestions rather than a binding rule.
-   **Pervasive Style Guide Violations:** The document fails to meet the basic requirements of a governing document. It uses improper cross-references (relative links, references to documents not provided), inconsistent formatting, and lacks the mandatory governance footer. This sloppiness undermines its authority.
-   **Dangerous Ambiguity in Data Handling (Section 9):** The statement that logs "SHOULD avoid retaining audio unless required" is a critical failure. This is a legally unacceptable loophole that directly threatens the MPOA's data sovereignty promises. What constitutes a "requirement" is not defined, creating a compliance gap large enough to nullify the entire purpose of a "sovereign" mode.

---

## Article-by-Article Review

### Section 1. Purpose

**Feedback:** The cross-references are improper and immediately invalidate the document's utility. "AIOS-SPEC-009" is not a provided context document. The reference to local markdown files (`[OLLAMA_RUNTIME_STANDARD.md]`) violates the Style Guide's requirement to cite full document titles. The bolding is sporadic and appears decorative rather than conforming to the rule of bolding a term on its first defining use.

**Scores:** Cross-Document Consistency: 1, Style & Clarity: 2

**Recommendation:**
1.  Replace all invalid references with proper citations as defined in the Style Guide, e.g., "as defined in the *Sovereign Voice Lanes Specification (AIOS-SPEC-009), Section 17.5*."
2.  Remove all relative file path links.
3.  Add a Definitions section or refer to the canonical glossary for terms like "sovereign" and "local-first."

### Section 2. When is local TTS required?

**Feedback:** This section hinges on the undefined concept of a product "claim." This is a significant legal gap. What constitutes a claim? A sentence on a public website? A configuration flag? A signed addendum? For this to be enforceable, the trigger condition must be deterministic.

**Scores:** Legal Enforceability: 1, Practical Operability: 2

**Recommendation:** Add a subsection defining the trigger mechanism.
**Proposed Text:** "A product is bound by this standard if its active Tenant configuration includes the `voice.sovereignty.mode: local_only` flag or if it is governed by a Service Order that explicitly includes 'Air-Gapped' or 'Local-First' voice services. Marketing language alone does not trigger this standard's normative requirements."

### Section 5. Readiness states (normative)

**Feedback:** The state `degraded` is too vague to be operable. It is defined as "Partial; disclose." This gives no guidance to a developer on what conditions constitute this state, nor to an operator on what to do about it. Is high latency "degraded"? Is one of three voices being unavailable "degraded"?

**Scores:** Practical Operability: 2, Legal Enforceability: 2

**Recommendation:** Replace the vague definition with a specific, measurable set of conditions.
**Proposed Text:** "`degraded`: The TTS service is running but fails to meet one or more of its declared operational parameters (e.g., latency exceeds 500ms P95, a non-default voice model is unavailable). The UI disclosure MUST specify the nature of the degradation."

### Section 9. Security and data handling

**Feedback:** This is the most critical failure in the document. The clause "Logs SHOULD avoid retaining audio unless required" is a legal liability. It creates a massive loophole that undermines the entire concept of a "sovereign" runtime. The term "trust zone" is also used without reference to a formal definition.

**Scores:** Legal Enforceability: 1, Conflict Freedom: 2

**Recommendation:** Replace the clause with language that is precise, binding, and defaults to secure.
**Proposed Text:** "Text payloads sent to a local TTS engine SHALL NOT leave the Tenant's logically isolated execution environment, as defined in the *Technical Manifesto (Article VII)*. Logs SHALL NOT retain audio payloads or derived audio artifacts. The only exception is for short-term diagnostic logging, which MUST be explicitly enabled by a Tenant Policy, limited to a 24-hour retention period, and generate a high-priority audit event upon activation and deactivation."

### General Document Feedback

**Feedback:** The document is missing the mandatory governance footer required by the Style Guide. Example: "**This specification is governed by the AIOS Governance Constitution (v1.0).**" This omission further signals its draft quality and lack of formal standing.

**Scores:** Style & Clarity: 1, Cross-Document Consistency: 1

**Recommendation:** Add the standard governance footer to the end of the document.

---

## Summary of Recommendations

| # | Section | Issue | Recommendation | Priority | Dimensions Affected |
|---|---------|-------|----------------|----------|---------------------|
| 1 | 9 | Vague data logging rule ("SHOULD avoid... unless required") creates a massive legal and compliance loophole. | Replace with a "fail-closed" rule: Logs SHALL NOT retain audio, with narrow, auditable exceptions explicitly enabled by Tenant Policy. | Critical | 3, 5, 6, 7 |
| 2 | 2 | The trigger for this standard, a "claim," is undefined, making the entire document unenforceable. | Define the specific configuration flag or contractual term that deterministically binds a deployment to this standard. | Critical | 3, 5, 7 |
| 3 | 1, 10 | Cross-references are invalid, use relative links, or point to un-provided documents. | Replace all references with formal citations that comply with the Style Guide (e.g., *Document Title (Article X, Section Y)*). | High | 1, 8 |
| 4 | General | Document lacks the mandatory governance footer required by the Style Guide. | Add the standard governance footer: "This specification is governed by the AIOS Governance Constitution (v1.0)." | High | 1, 8 |
| 5 | 5 | The `degraded` readiness state is too ambiguous to be implemented or audited. | Define `degraded` with specific, measurable criteria (e.g., latency thresholds, asset availability). | Medium | 7, 9 |

---

## Final Verdict

**Disposition:** major_revision_required

**Rationale:** The document scores a 1 (Critical Failure) in Legal Enforceability and has multiple scores of 2. The composite score of 2.5 is well below the threshold for even "Approved with Changes." The standard is architecturally sound but legally and operationally broken. It cannot be ratified in its current state.

**Top 3 Actions Required:**
1.  **Define Your Terms:** Add a "Definitions" section that gives legally precise meanings to "sovereign claim," "local-first," and "trust zone," or reference the documents where these are already defined.
2.  **Close the Logging Loophole:** Rewrite Section 9 to prohibit audio logging by default, permitting it only under strict, auditable, Tenant-controlled policy exceptions.
3.  **Align with Governance Framework:** Fix all cross-references to use formal citations, remove relative links, add the governance footer, and clean up formatting to comply with the Style Guide.