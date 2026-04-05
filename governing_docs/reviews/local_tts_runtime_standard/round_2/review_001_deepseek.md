---
review_id: REV-LOCAL_TTS_RUNTIME_STANDARD-001
document_reviewed: LOCAL_TTS_RUNTIME_STANDARD.md
document_version: 0.1.0
reviewer: DeepSeek
review_date: 2026-04-04
review_round: 2
review_type: technical
disposition: major_revision_required
composite_score: 2.5
---

# Peer Review: Local Text-to-Speech (TTS) Runtime Standard

## Grading Scorecard

| # | Dimension | Score (1-5) | Key Finding |
|---|-----------|:-----------:|-------------|
| 1 | Cross-Document Consistency | 2 | References AIOS-SPEC-009 but lacks proper citation format and fails to connect to the Technical Manifesto's ingress principles. |
| 2 | Business Model Alignment | 3 | Supports sovereign/local-first positioning but lacks marketplace integration for TTS engine vendors. |
| 3 | Legal Enforceability | 2 | Uses RFC 2119 terms but lacks specific liability boundaries, SLAs, and fails to reference the MPOA for economic terms. |
| 4 | Architectural Fidelity | 2 | Does not reference the Technical Manifesto's separation of powers, fails to define how TTS integrates with the UI Surface or Orchestration Core. |
| 5 | Completeness | 3 | Covers basic operational requirements but lacks JSON schemas, CLI commands, and detailed integration with the DCP. |
| 6 | Conflict Freedom | 4 | No direct contradictions found, but potential tension with Manifesto's ingress principles regarding PTT default. |
| 7 | Practical Operability | 3 | Provides actionable states and checks but lacks specific implementation examples and error handling procedures. |
| 8 | Style & Clarity | 4 | Generally follows style guide with clear tables, but inconsistent use of bold and missing governance footer. |
| 9 | Developer Synchrony | 2 | Missing schemas, CLI references, and specific integration points with NodeContracts and PolicyRecords. |
| 10 | Platform Economics Synchrony | 1 | Completely ignores the 2x multiplier, Funded Data Accounts, and economic mechanics defined in the MPOA. |
| 11 | Friction Factor | 3 | Minimal process friction but lacks proportional risk-based approval gates for Tier 3 voice runtime components. |
| | **Composite Score** | **2.5** | |

---

## Overall Assessment

### Strengths

1. **Clear operational focus**: The document establishes specific readiness states (§5) and checks (§6) that are actionable for operators.
2. **Well-structured tables**: The capability mapping (§4) and requirement tables (§2) provide clear, scannable specifications.
3. **Fallback logic alignment**: §7 correctly references AIOS-SPEC-009 and establishes clear fallback behavior rules.

### Critical Gaps

1. **Missing architectural integration**: The document fails to define how Local TTS integrates with the AIOS architecture defined in the Technical Manifesto (Article I).
2. **No economic considerations**: Complete omission of how TTS usage affects Funded Data Accounts or follows the 2x multiplier rule for external intelligence.
3. **Insufficient developer guidance**: Lacks JSON schemas, CLI commands, and specific integration examples with NodeContracts and Skills.
4. **Weak security specifications**: §9 is vague and doesn't reference the Security & Threat Model from the Technical Manifesto (Article VIII).

---

## Article-by-Article Review

### 1. Purpose

**Feedback:** The purpose section correctly identifies the document's scope but fails to establish its authority within the AIOS governance framework. It references AIOS-SPEC-009 §17.5 but doesn't explain how this standard implements or extends that specification. Missing connection to the Technical Manifesto's ingress principles.

**Scores:** Cross-Document Consistency: 2, Architectural Fidelity: 2

**Recommendation:** Add a governance statement and clarify the relationship hierarchy. Proposed text:
```
**Governance Context:** This standard implements the sovereign voice output requirements defined in AIOS-SPEC-009 §17, operating under the architectural principles established in the AIOS Technical Manifesto (Article I: The Sovereign Architecture). Local TTS execution is governed by the same Policy Engine and Stateful Shell orchestration as all AIOS capabilities.
```

### 2. When is local TTS required?

**Feedback:** The table format is clear, but the requirements lack specificity about how these rules are enforced by the Policy Engine. The "SHALL" terminology is appropriate but needs to reference the enforcement mechanism.

**Scores:** Practical Operability: 3, Architectural Fidelity: 2

**Recommendation:** Add a column for "Enforcement Mechanism" and reference PolicyRecords. Proposed addition to the table:
```
| Context | Requirement | Enforcement Mechanism |
|---------|-------------|----------------------|
| **Product claims sovereign, local-first, or air-gapped speech output** | **Local TTS** **SHALL** be the **default** path when the environment is **declared** for local voice. | PolicyRecord `voice-output-sovereign` with `default-action: local-tts` |
```

### 4. Approved capabilities

**Feedback:** The capability table is useful but incomplete. It doesn't show how `local.tts.speak` integrates with SkillPrimitives or what the input/output schemas are. Missing reference to the canonical capability registry.

**Scores:** Developer Synchrony: 2, Completeness: 3

**Recommendation:** Add schema definitions and registry integration. Proposed addition:
```
**Schema Definition:**
```json
{
  "$schema": "https://platform.gateway.global/schemas/skill-primitive/v1",
  "id": "local.tts.speak",
  "type": "skill-primitive",
  "inputs": {
    "text": {"type": "string", "maxLength": 5000},
    "voice_id": {"type": "string", "pattern": "^[a-z0-9-_]+$"},
    "rate": {"type": "number", "minimum": 0.5, "maximum": 2.0, "default": 1.0}
  },
  "outputs": {
    "audio_data": {"type": "string", "format": "base64"},
    "duration_ms": {"type": "integer"},
    "engine": {"type": "string"}
  },
  "tool_access": ["local-tts-engine"],
  "max_latency_ms": 5000
}
```
```

### 7. Fallback: remote TTS

**Feedback:** This section correctly references other documents but fails to address the economic implications of fallback. Remote TTS would trigger the 2x multiplier on external intelligence, but this isn't mentioned.

**Scores:** Platform Economics Synchrony: 1, Cross-Document Consistency: 2

**Recommendation:** Add economic disclosure requirements. Proposed addition to the table:
```
| Condition | Behavior | Economic Impact |
|-----------|----------|-----------------|
| Local **not** `running_ready` | **Block** or **proposal** — **never** silent remote TTS. | If proposal accepted and remote TTS used, debits Funded Data Account at 2.0x upstream cost |
| User **opts in** to cloud voice | Remote allowed; **audit** / disclose. | Debits Funded Data Account at 2.0x upstream cost; itemized in billing log |
```

### 9. Security and data handling

**Feedback:** This section is dangerously vague. "Trust zone" is undefined, and the logging recommendation contradicts the immutable audit log requirement from the Technical Manifesto (Article VI).

**Scores:** Architectural Fidelity: 1, Legal Enforceability: 2

**Recommendation:** Replace with specific security requirements aligned with Article VIII. Proposed replacement:
```
## 9. Security and Data Handling

- **Text Sanitization**: All text sent to TTS engines **SHALL** be sanitized by the Kernel's input validation layer before synthesis to prevent injection attacks.
- **Immutable Audit Logging**: Every TTS synthesis request **SHALL** generate an immutable audit log entry including: request timestamp, text hash (SHA-256), voice_id, engine used, and synthesis duration. Audio data **MAY** be excluded from persistent logs for privacy, but metadata **MUST** be retained per Article VI of the Technical Manifesto.
- **Trust Zone Enforcement**: For sovereign modes, TTS synthesis **MUST** occur within the same logical isolation boundary as the Tenant's persistent state store, with no network egress to external services.
- **Supply Chain Integrity**: TTS engine binaries and models **MUST** be cryptographically signed and verified against the platform trust store before execution, per Article VIII, Section 2 of the Technical Manifesto.
```

---

## Summary of Recommendations

| # | Section | Issue | Recommendation | Priority | Dimensions Affected |
|---|---------|-------|----------------|----------|---------------------|
| 1 | Entire Document | Missing architectural integration | Add governance context section referencing Technical Manifesto Articles I and VIII | Critical | 1, 4, 9 |
| 2 | §4 Approved capabilities | Missing schemas and registry integration | Add JSON schema for `local.tts.speak` SkillPrimitive | High | 5, 9 |
| 3 | §7 Fallback | Ignores economic implications | Add economic impact column to fallback table | Critical | 10 |
| 4 | §9 Security | Vague and contradictory | Replace with specific security requirements aligned with Technical Manifesto Article VIII | High | 3, 4, 6 |
| 5 | §3 Installation | Missing DCP integration | Add requirement for TTS engine installation via DCP with supply-chain attestations | Medium | 4, 7, 9 |
| 6 | Document Footer | Missing governance statement | Add "This standard is governed by the AIOS Governance Constitution (v1.0)." | Low | 1, 8 |

---

## Final Verdict

**Disposition:** major_revision_required

**Rationale:** The document scores 1 in Platform Economics Synchrony (critical failure) and 2 in three other dimensions (Cross-Document Consistency, Architectural Fidelity, Developer Synchrony), triggering the "Major Revision Required" disposition per the rubric rules.

**Top 3 Actions Required:**
1. **Integrate with AIOS economic model**: Add explicit references to Funded Data Accounts and the 2x multiplier for any remote TTS fallback, aligning with MPOA Article II.
2. **Define architectural integration**: Specify how Local TTS fits within the Technical Manifesto's separation of powers, referencing the UI Surface, Orchestration Core, and Policy Engine.
3. **Add developer-facing specifications**: Include JSON schemas for the TTS SkillPrimitive, CLI commands for engine management, and integration examples with NodeContracts.