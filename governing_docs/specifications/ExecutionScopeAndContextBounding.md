---
document_id: AIOS-SPEC-010
title: Execution Scope and Context Bounding
version: 1.0.2
status: draft
category: specification
author: Gateway Global AIOS
created: 2026-04-04
last_updated: 2026-04-06
reviewers: []
supersedes: null
cross_references:
  - { doc_id: "AIOS-CORE-001", relationship: "implements" }
  - { doc_id: "AIOS-CORE-002", relationship: "constrained_by" }
  - { doc_id: "AIOS-CORE-003", relationship: "complements" }
  - { doc_id: "AIOS-SPEC-003", relationship: "extends" }
  - { doc_id: "AIOS-SPEC-005", relationship: "complements" }
  - { doc_id: "AIOS-SPEC-009", relationship: "constrained_by" }
  - { doc_id: "AIOS-SPEC-001", relationship: "complements" }
amendment_history:
  - { version: "1.0.1", date: "2026-04-04", summary: "Scope confidence, breadth/risk, expansion prohibition, context bounding, read/write line, audited overrides, scope_rationale." }
---

# AIOS Execution Scope and Context Bounding v1.0.1

## 1. Architectural Purpose

This specification defines the **Execution Scope Envelope** — the governed bridge between **plan** and **execution** for any work performed by humans, automation, coding agents, or MCP-backed tools on the AIOS platform.

Without an explicit scope envelope:

- Implementations drift across the repository and governing corpus.
- Token context is wasted on irrelevant paths.
- Agents may modify or review assets outside the legislative and policy boundary.
- Risk becomes unbounded and non-auditable.

This document is **not** a peer-review rubric and **not** a portfolio assessment. It is a **deterministic contract** that every approved execution plan must satisfy before tools or agents act.

The Execution Scope Envelope aligns with:

- **Technical Manifesto** — deterministic execution, separation of powers, transparency.
- **Governance Constitution Article II** — Development Control Plane (DCP); no capability without the legislative pipeline.
- **MPOA** — liability and data-sovereignty boundaries for what may be read or written.

---

## 2. Normative Definitions

| Term | Definition |
|------|------------|
| **Execution plan** | A structured description of intended work, including intent, steps, and policy hooks, whether human-authored or compiled from higher-level intent. |
| **Scope envelope** | The machine-readable set of allowed paths, documents, and verification targets for a single execution plan. |
| **Review-only path** | A path that may be read and analyzed but not modified by the plan’s executors unless escalated. |
| **Modify path** | A path that the plan is explicitly authorized to change. |
| **Protected path** | A path that must not be read or modified by this plan; presence in context is a policy violation unless escalated. |
| **Governing document reference** | A `document_id` or file path under the governing corpus that constrains or informs the plan. |
| **Verification target** | A command, test suite, or check that must pass for the plan to be considered successfully executed. |
| **Scope expansion** | Any increase in read, write, or context reach beyond the approved envelope for a given plan instance. |

---

## 3. Mandatory Scope Object

Every **governed execution plan** that is compiled for DCP promotion, agent execution, or MCP-orchestrated change **SHALL** include a **scope object** conforming to Section 4.

Plans that omit a scope object, or whose scope object fails validation, **MUST NOT** be treated as approved for automated or agent execution. They may be held in **draft** or routed to human escalation per Constitution and DCP tier rules.

This requirement applies whether the executor is a coding agent, CI job, or internal tool plane.

### 3.1 Uncertain Scope and Escalation

If the **`scope_confidence`** field is **`low`** or is **omitted** from the scope object, the plan **SHALL** require **operator review** prior to automated or agent execution. Where the intended work requires a broader envelope, the plan **SHALL** obtain **explicit scope expansion** through re-compilation of the execution plan (or an equivalent DCP-approved change)—**before** execution proceeds.

Pretended precision (over-narrow or over-confident scopes that omit necessary paths) **SHALL** be treated as a validation failure or as a **low-confidence** state per `scope_confidence` (Section 4), not as an excuse to run unbounded.

---

## 4. Normative JSON Shape

The scope object **SHALL** be carried as a JSON object (embedded in the plan artifact or referenced by stable URI). Required keys and optional keys:

```json
{
  "schema_version": "1.0",
  "intent_summary": "string",
  "plan_id": "string",
  "scope_confidence": "high",
  "scope_rationale": [
    "Human-readable justification for why these paths and docs bound the work"
  ],
  "scope": {
    "review_files": [],
    "modify_files": [],
    "protected_files": [],
    "governing_docs": [],
    "verification_targets": []
  }
}
```

### 4.1 Field Semantics

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `schema_version` | string | yes | Version of this shape; `"1.0"` for this spec revision. |
| `intent_summary` | string | yes | One-paragraph summary of the governing intent for audit. |
| `plan_id` | string | yes | Stable identifier for the plan instance (UUID or DCP reference). |
| `scope_confidence` | string | yes | One of `high`, `medium`, `low`. Omission or an invalid value **SHALL** fail validation or require operator review per Section 3.1. |
| `scope_rationale` | array of strings | yes | Short bullets explaining *why* this scope is sufficient (e.g. which components own the behavior). Supports audit, debugging, and human review. |
| `scope.review_files` | array of strings | yes | Repository-relative or corpus-relative paths that may be read for analysis. May be empty only if justified in plan metadata. |
| `scope.modify_files` | array of strings | yes | Paths the plan is authorized to modify. Empty array means no file write beyond ephemeral build artifacts (must be stated explicitly). |
| `scope.protected_files` | array of strings | yes | Paths that **must not** be read or written by executors for this plan. Typical examples: unrelated tenants, production secrets, out-of-scope governing docs. |
| `scope.governing_docs` | array of strings | yes | `document_id` values or paths to markdown under the governing corpus that bound the work. |
| `scope.verification_targets` | array of strings | yes | Commands or named checks (e.g. `npm test`, `pnpm lint`, conformance suite id). May be empty with explicit risk acceptance recorded in DCP. |

Paths **SHALL** use forward slashes and **SHALL NOT** contain `..` traversal segments.

### 4.2 Consistency Rules

1. **Disjointness:** `modify_files` and `protected_files` **SHALL NOT** intersect. If a path must move from protected to modifiable, the plan **SHALL** be recompiled with a new scope object.
2. **Subset:** Every path in `modify_files` **SHOULD** appear in `review_files` or be explicitly justified (e.g. newly created file) in plan metadata.
3. **Governing coverage:** For governance-affecting work, `governing_docs` **SHALL** include at least one document that authorizes or constrains the change class (e.g. amendment, SPEC, runtime standard).
4. **Read vs write:** Paths listed only under `review_files` **SHALL NOT** be modified by executors unless the same path also appears under `modify_files` (or a new path is added via re-compiled scope). This prevents accidental write expansion from read-only analysis.

### 4.3 Scope Breadth and Risk Classification

Scope breadth **SHALL** inform risk classification and DCP tier treatment (aligned with **AIOS-SPEC-009** and Constitution/DCP practice):

| Breadth (illustrative) | Risk signal |
|------------------------|-------------|
| Single-file or tightly localized paths | Lower baseline risk (subject to content sensitivity). |
| Multi-module, cross-domain, or cross-tenant paths | Elevated risk; stronger gate and evidence requirements. |
| Repository-wide or “entire corpus” style reach | Highest risk; **SHALL** require explicit approval and documented rationale in DCP or equivalent. |

Executors **SHALL NOT** use narrow file lists to conceal broad intent; `scope_rationale` and `scope_confidence` exist to surface ambiguity.

### 4.4 Scope Expansion Prohibition

Agents, MCP tools, and automated pipelines **SHALL NOT** expand execution scope beyond the approved envelope by:

- adding paths to read, write, or inject into model context; or
- treating out-of-envelope assets as implicitly allowed;

except through:

1. **Re-compilation** of the execution plan and issuance of a **new** scope object and `plan_id` (or superseding revision), or  
2. **Explicit operator approval** recorded in the audit trail with the expanded paths enumerated.

Silent or implicit scope creep **SHALL** be treated as a policy violation.

---

## 5. Enforcement and Gates

### 5.1 DCP and Tier Alignment

- Scope validation **SHALL** be part of the DCP compiler gate for Tier 2 and Tier 3 changes as defined in **Governance Constitution** and DCP operating practice.
- A plan whose tool or agent actions would touch a path not listed in `modify_files`, or would read a `protected_files` path, **SHALL** fail the gate or require Council / delegated approval per tier rules.
- **Scope breadth** (Section 4.3) **SHALL** feed tier and evidence requirements alongside content sensitivity.

### 5.2 Agent, MCP, and Context Bounding

- Coding agents and MCP servers **SHALL** receive only **allow-listed** path operations: reads and writes must stay within `review_files`, `modify_files`, and governing-doc reads as authorized by the plan type.
- **Context bounding:** By default, **only** files and governing documents that appear in the approved scope envelope **SHALL** be supplied as **model or tool context** to LLMs, agents, or MCP-backed tools for that plan. Broader retrieval (e.g. whole-repo embedding search) **SHALL** be disabled or filtered to the envelope unless the plan explicitly authorizes a wider retrieval mode under DCP.
- Attempts to access paths outside the envelope **SHALL** be denied and logged as **policy violations** (see **AIOS-SPEC-009** for security logging expectations).
- **Confirmed policy violations** resulting from scope breaches **SHALL** be subject to the **liability and indemnification** provisions in the **Master Platform Operating Agreement (Article III)**.

### 5.3 Override of Scope Envelope

Emergency or break-glass flows **MAY** bypass or relax scope checks only under **Governance Constitution Article IV** and **AIOS-SPEC-009** emergency provisions.

Any override of the execution scope envelope **SHALL**:

1. Be **explicitly recorded** (who/what/when, and which paths or operations were allowed beyond the envelope).
2. **Reference the governing authority** under **Governance Constitution Article IV** (and, where applicable, the **AIOS-SPEC-009** provisions invoked).
3. **Require the constitutionally defined multi-party authorization** for that emergency or break-glass path.
4. Be **auditable in system logs** and retained per platform audit policy.

Post-hoc review **SHALL** be available to governance roles as under **AIOS-CORE-002**.

---

## 6. Relationship to Other Specifications

| Document | Relationship |
|----------|----------------|
| **AIOS-SPEC-003** (AIP) | Agents receive capabilities; this spec bounds which repository and corpus regions those capabilities may touch per plan. |
| **AIOS-SPEC-005** (Agents guide) | Developer-facing guidance **SHALL** align with scope envelope requirements for agent-driven edits. |
| **AIOS-SPEC-009** (Security & Sandboxing) | Sandboxing, logging, and MCP constraints apply within the scope envelope; scope breadth informs risk alongside security tiering. |
| **AIOS-SPEC-001** (NodeContract) | NodeContracts define deterministic law; scope envelopes define which files and docs may be edited when implementing a change. |
| **AIOS-CORE-002** | DCP and legislative pipeline are the authoritative process for when scope may expand (e.g. new capability). |

---

## 7. Non-Goals

This specification does **not**:

- Replace **peer review** or **portfolio review** artifacts.
- Define the **Intent** grammar or **NodeContract** schema.
- Substitute for **vendor certification** or **Clean Room** rules.
- Mandate a specific CI vendor; it defines **what must be proven**, not **how** CI is hosted.

---

## 8. Compliance Statement

A platform component **conforms** to AIOS-SPEC-010 if it:

1. Emits or consumes scope objects in the shape of Section 4 for all governed execution plans it participates in, **including integration with DCP compilation gates** as defined in **Governance Constitution Article II** where the component participates in the legislative pipeline.
2. Enforces path boundaries and **read vs write** rules (Section 4.2) for agents and MCP tools.
3. Applies **context bounding** (Section 5.2) so model and tool context defaults to the envelope.
4. Honors **scope expansion** rules (Section 4.4) without silent broadening.
5. Records violations, denials, and **authorized overrides** in a manner auditable under **AIOS-CORE-002** and **AIOS-SPEC-009**.

---

## Document history

| Version | Date | Summary |
|---------|------|---------|
| 1.0.0 | 2026-04-04 | Initial draft: execution scope envelope, JSON shape, enforcement hooks. |
| 1.0.1 | 2026-04-04 | Confidence/escalation, breadth/risk, expansion prohibition, context bounding, read/write rule, audited overrides, `scope_rationale`. |
| 1.0.2 | 2026-04-06 | Deterministic escalation trigger (§3.1); required `scope_confidence` and `scope_rationale` (§4.1); Article IV + multi-party override rules (§5.3); MPOA liability linkage (§5.2); DCP compliance hook (§8). |
