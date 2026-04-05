review_id: REV-OLLAMA_RUNTIME_STANDARD-001
document_reviewed: OLLAMA_RUNTIME_STANDARD
document_version: 0.1.0
reviewer: Gemini
review_date: 2026-04-04
review_round: 2
review_type: legal
disposition: major_revision_required
composite_score: 2.8
---

# Peer Review: Ollama Local Model Runtime Standard

## Grading Scorecard

| # | Dimension | Score (1-5) | Key Finding |
|---|-----------|:-----------:|-------------|
| 1 | Cross-Document Consistency | 2 | Cross-references use informal IDs, not the full titles and Article/Section numbers required by the Style Guide. |
| 2 | Business Model Alignment | 4 | The document strongly supports the "sovereign," "local-first" enterprise value proposition. |
| 3 | Legal Enforceability | 2 | The rules for data handling and user consent for cloud fallback are too weak ("SHOULD" instead of "SHALL") to be legally enforceable. |
| 4 | Architectural Fidelity | 4 | The standard correctly positions the local model as a bounded interpretation tool, consistent with the Technical Manifesto. |
| 5 | Completeness | 3 | While it addresses its stated purpose, the document omits any discussion of liability or performance SLAs for local model failures. |
| 6 | Conflict Freedom | 3 | The "silent substitute" prohibition is good, but the cloud fallback process is not explicitly tied to the MPOA's data sovereignty rules, creating potential conflict. |
| 7 | Practical Operability | 4 | The readiness states and checks provide a clear, actionable framework for system operators. |
| 8 | Style & Clarity | 3 | The document is clearly written but violates several Style Guide conventions for cross-referencing, document naming, and sectioning. |
| 9 | Developer Synchrony | 4 | A developer could clearly understand the rules of engagement for using the local runtime from this document. |
| 10 | Platform Economics Synchrony | 1 | The document fails to mention that using the cloud fallback (Gemini) would debit the Tenant's Funded Data Account, a critical economic omission. |
| 11 | Friction Factor | 4 | The standard provides clear guidance without imposing excessive bureaucracy on developers or operators. |
| | **Composite Score** | **3.1** | **(Note: Disposition is `major_revision_required` due to a dimension score of 1)** |

---

## Overall Assessment

### Strengths

- **Clear Operational Guidance (Section 5, 6):** The definition of readiness states and mandatory checks provides a practical and implementable framework for operators, reducing ambiguity in deployment.
- **Architectural Alignment (Section 4):** The document does an excellent job of defining the narrow, approved use cases for the local model, ensuring it acts as a subordinate interpretation layer and does not encroach on the deterministic governance kernel.
- **Explicit Prohibition of Silent Fallback (Section 7):** The rule that the system must "never silent substitute" a cloud model for a failed local one is a critical and well-defined safeguard that builds trust.

### Critical Gaps

- **Legally Insufficient Data Handling Rules (Section 9):** The use of "SHOULD be redacted" for PII-laden prompts and logs is unacceptable for an enterprise-grade standard. This must be a "SHALL" to be compliant and enforceable.
- **Missing Economic Linkage (Section 7):** The document completely omits the fact that cloud fallbacks trigger costs against the Tenant's Funded Data Account, as defined in the MPOA. This is a critical failure in economic transparency.
- **Vague Consent Mechanism (Section 7):** The standard allows cloud fallback if a "User explicitly opts in" but fails to define what constitutes legally sufficient consent (e.g., one-time setting vs. per-action confirmation), creating significant compliance risk.
- **Systemic Style Guide Violations (All Sections):** Cross-references are improper, document structure deviates from the guide for "Specifications," and the file name does not follow convention. This signals a lack of governance rigor.

---

## Article-by-Article Review

### Section 1. Purpose

**Feedback:** The purpose is clearly stated. However, the cross-references are not compliant with the Style Guide. They should be full citations. "aspirational" is a weasel word that should be avoided; "unenforceable" or "ambiguous" would be better.
**Scores:** Style & Clarity: 3
**Recommendation:**
Change:
`as defined in **AIOS-SPEC-009 §16**`
To:
`as defined in the Workspace Interpretation Standard (AIOS-SPEC-009, Section 16)`

### Section 2. When is local Ollama required?

**Feedback:** The use of RFC 2119 keywords (SHALL, SHOULD) is good and provides clarity. The distinction between interpretation and MCP retrieval is well-drawn and consistent with the architecture.
**Scores:** Architectural Fidelity: 5, Legal Enforceability: 4
**Recommendation:** No changes needed.

### Section 7. Fallback: when may Gemini or remote models run?

**Feedback:** This is the most legally problematic section. The conditions for fallback are dangerously vague.
1.  **Missing Economics:** It fails to state that using a remote model invokes the "External Intelligence Multiplier" from the MPOA (Article II) and debits the Funded Data Account. This is a massive transparency gap.
2.  **Vague Consent:** "User explicitly opts in" is not a defined, auditable action. This creates ambiguity that could lead to disputes over data sovereignty and billing.
3.  **Audit Trail:** The requirement for an audit trail is good but should explicitly reference the MPOA's data sovereignty clauses to ensure the audit log captures the necessary consent and data handling attestations.

**Scores:** Legal Enforceability: 1, Platform Economics Synchrony: 1, Conflict Freedom: 2
**Recommendation:**
Add a new row to the table to explicitly link fallback to platform economics:

| Condition | Behavior |
|-----------|----------|
| **Remote inference is triggered** | **The action SHALL debit the Tenant's Funded Data Account** per the *Master Platform Operating Agreement (Article II)*. The UI MUST disclose this cost implication at the point of choice. |

Modify the "User explicitly opts in" row:
**Old Text:** `User explicitly opts in to cloud`
**New Text:** `User provides explicit, per-action consent via a UI confirmation prompt that discloses the use of a remote model and the associated data handling implications per the MPOA.`

### Section 9. Security and data handling

**Feedback:** The use of "SHOULD" for redacting or disabling logs containing sensitive email/calendar data is a critical failure of legal and compliance rigor. For a system claiming "sovereignty," this must be a default, non-negotiable requirement.
**Scores:** Legal Enforceability: 1
**Recommendation:**
Change:
`Logs of prompts/responses SHOULD be redacted or disabled in production unless compliance requires retention.`
To:
`Logs of prompts and responses containing Tenant data SHALL be disabled by default in production environments. If logging is enabled for compliance or debugging, all PII and sensitive content within the prompts and responses SHALL be redacted prior to persistence.`

### Section 10. Relationship to other documents

**Feedback:** This section violates the Style Guide's cross-referencing rules. It lists document IDs without full titles or context, undermining the document's formal standing within the governance framework.
**Scores:** Cross-Document Consistency: 1, Style & Clarity: 2
**Recommendation:**
Rewrite the section to be a proper narrative description of the relationships, citing documents correctly.
Example for the first entry:
`This standard implements the local model lane requirements defined in the **Workspace Interpretation Standard (AIOS-SPEC-009), Section 16**, which establishes policies POL-MODEL-001 through POL-MODEL-004.`

---

## Summary of Recommendations

| # | Section | Issue | Recommendation | Priority | Dimensions Affected |
|---|---------|-------|----------------|----------|---------------------|
| 1 | Sec 9 | Data handling for logs is a weak "SHOULD," creating massive compliance risk. | Change "SHOULD be redacted" to "SHALL be disabled by default" and "SHALL be redacted" if enabled. | Critical | 3 (Legal), 6 (Conflict) |
| 2 | Sec 7 | Document fails to state that cloud fallback incurs costs against the Funded Data Account. | Add a rule explicitly stating that remote inference debits the FDA per the MPOA and this must be disclosed in the UI. | Critical | 10 (Econ), 3 (Legal) |
| 3 | Sec 7 | The "opt-in" consent mechanism for cloud fallback is legally vague. | Redefine "opt-in" to require explicit, per-action consent via a UI prompt that discloses remote model use. | High | 3 (Legal), 7 (Operability) |
| 4 | All | Cross-references are informal document IDs, violating the Style Guide. | Update all cross-references to use the full document title and specific Article/Section, as mandated by the Style Guide. | Medium | 1 (Consistency), 8 (Style) |

---

## Final Verdict

**Disposition:** major_revision_required

**Rationale:** The document receives this disposition because it has a score of 1 in a critical dimension (Platform Economics Synchrony) and scores of 2 in two other key dimensions (Cross-Document Consistency and Legal Enforceability). The failure to address the economic impact of cloud fallback and the weak, unenforceable language around data security and consent represent fundamental gaps that are incompatible with an enterprise-grade governance framework.

**Top 3 Actions Required:**
1.  **Harden Data Handling:** Revise Section 9 to mandate (`SHALL`) the disabling or redacting of logs containing sensitive Tenant data.
2.  **Integrate Platform Economics:** Revise Section 7 to explicitly state that remote model fallback debits the Funded Data Account per the MPOA, and this must be disclosed to the user.
3.  **Specify Consent:** Revise Section 7 to define a legally sufficient, per-action consent mechanism for authorizing the use of remote models, removing all ambiguity.