---
document_id: AIOS-SPEC-008
version: 0.1.0
status: draft
category: specification
title: Intent Discovery & Onboarding Framework
author: Gateway Global AIOS
created: 2026-04-02
last_updated: 2026-04-02
reviewers: []
supersedes: null
cross_references:
  - AIOS-CORE-001
  - AIOS-SPEC-003
  - AIOS-SPEC-006
  - AIOS-SPEC-007
  - AIOS-SPEC-009
  - AMD-2026-005
  - AMD-2026-007
amendment_history: []
---

# AIOS-SPEC-008 — Intent Discovery & Onboarding Framework

## Implementation status (v0.1)

This specification defines the intended model for intent discovery and onboarding.

The **normative intent primitive** (definition, schema, lifecycle, UI contract) is **[AIOS-SPEC-009 — Intent Primitive and Execution Model](./IntentPrimitiveAndExecutionModel.md)**. This document (**AIOS-SPEC-008**) **MUST** stay aligned with SPEC-009 for intent semantics; discovery and onboarding extend that primitive.

At v0.1:

- The model is partially implemented
- Enforcement is limited to specific flows (e.g. Workspace onboarding)
- Full lifecycle enforcement is not yet required

This spec SHOULD guide design decisions but MUST NOT block current Workplace integration progress.

---

## Initial target (v0.1)

The first validated implementation of this framework is:

- Google Workspace onboarding and execution flow

Success criteria:

- intent → onboarding → integration → execution → outcome

Future intents (e.g. Gmail, Docs) will extend this pattern.

---

## 1. Architectural Purpose

This specification defines how AI OS identifies, qualifies, onboards, executes, and learns user intents.

The purpose of this specification is to replace generic app-first workflows with an intent-first operating model in which:

- known intents are routed into predefined governed execution paths
- unknown intents enter a governed discovery process
- prerequisites, integrations, permissions, and planning steps are prepared before execution
- successful intent patterns can be formalized into reusable system capabilities

This specification defines the intent operating framework for AI OS.

---

## 2. Relationship to Governing Documents

| Principle | Enforced Via |
|-----------|--------------|
| Intent-driven execution | Intent classification, onboarding, and execution model |
| Policy supremacy | Discovery, onboarding, and execution require policy checks |
| UI sovereignty | Surfaces are summoned based on intent state, not static navigation |
| Deterministic execution | Known intents use governed playbooks and routing contracts |
| Governed evolution | Unknown intents require research, qualification, and amendment/spec path before platform-wide adoption |

---

## 3. Core Definitions

### 3.1 Intent
A user-declared or system-inferred desired outcome that requires one or more prerequisites, integrations, workflows, surfaces, or decisions.

### 3.2 Known Intent
An intent already defined in the AI OS intent registry with a governed execution path.

### 3.3 Unknown Intent
An intent not yet defined in the intent registry or not yet mapped to a reliable governed path.

### 3.4 Intent Onboarding
The governed preparation phase that configures the system, the user, and any required integrations for a specific intent.

### 3.5 Intent Discovery
The governed process by which AI OS studies, qualifies, and proposes a path for an unknown intent.

### 3.6 Intent Playbook
A reusable governed definition of:
- prerequisites
- routing
- surfaces
- skills
- integrations
- policies
- success criteria

### 3.7 Systematized Intent
A previously unknown intent that has been formalized into a reusable governed path.

---

## 4. Intent Lifecycle

AI OS MUST model intent progression through the following lifecycle:

1. Intent Declaration
2. Intent Qualification
3. Intent Onboarding
4. Intent Execution
5. Outcome Review
6. Intent Learning
7. Intent Formalization (if applicable)

### 4.1 Lifecycle Meanings

#### Intent Declaration
The user states or the system identifies an intent.

#### Intent Qualification
The system determines whether the intent is:
- known
- partially known
- unknown
- disallowed

#### Intent Onboarding
The system prepares the path to execution:
- required context
- required integrations
- permissions
- planning sequence
- state transitions

#### Intent Execution
The system carries out the governed workflow.

#### Outcome Review
The system and user evaluate whether the intent was successfully fulfilled.

#### Intent Learning
The system records gaps, friction, missing skills, and candidate improvements.

#### Intent Formalization
If the intent proves valuable and repeatable, it may be proposed for codification as a system capability.

---

## 5. Known Intent Onboarding Model

Known intents MUST use a deterministic onboarding path.

### 5.1 Known Intent Requirements

Each known intent MUST define:
- intent identifier
- desired outcome
- prerequisites
- required integrations
- required permissions
- required surfaces
- required skills
- applicable policies
- success criteria
- failure states

### 5.2 Specialized Boot Sequence

For known intents, AI OS MAY perform a specialized boot sequence that:
- summons relevant surfaces
- activates relevant policies
- narrows available skills
- prepares required integrations
- reduces irrelevant UI and options

### 5.3 Example
A known intent such as `launch_product_campaign` may preload:
- planning surface
- document brief surface
- calendar coordination surface
- Google Workspace integration state
- campaign checklist

---

## 6. Unknown Intent Discovery Model

Unknown intents MUST NOT be executed through improvisation alone.

### 6.1 Discovery Mode

When an unknown intent is detected, AI OS enters Discovery Mode.

Discovery Mode MAY include:
- clarification of desired outcome
- identification of required prerequisites
- research of methods
- mapping of existing platform skills
- search of MCP integration library
- search of approved external repositories
- capability gap analysis

### 6.2 Discovery Outcomes

Discovery Mode MUST end in one of the following:

- insufficiently defined
- unsupported
- supported by existing capabilities
- supported by external integration
- candidate for new skill/playbook
- candidate for governance amendment/spec update

### 6.3 Discovery State Disclosure

The UI MUST make it clear when the system is:
- clarifying
- researching
- preparing
- awaiting approval
- unable to proceed

The system MUST NOT pretend an unknown intent is already operationalized when it is still under discovery.

---

## 7. Intent Onboarding State Model

AI OS MUST expose onboarding state explicitly.

### 7.1 Required Intent Onboarding States

- `intent_unknown`
- `intent_qualified`
- `intent_requires_context`
- `intent_requires_integration`
- `intent_requires_permission`
- `intent_ready_for_execution`
- `intent_blocked`
- `intent_under_discovery`
- `intent_under_review`

### 7.2 UI Behavior

The UI SHOULD greet the user at the onboarding state appropriate to the active intent.

Example:
- If the intent requires Google Workspace and none is connected, the onboarding state MUST direct the user into Workspace connection or acknowledge the limitation.

---

## 8. Intent Playbook Structure

Each known or systematized intent SHOULD be represented as a governed playbook.

### 8.1 Required Fields

- playbook_id
- intent_id
- outcome_definition
- entry_conditions
- prerequisites
- integrations
- surfaces
- skills
- policies
- confirmation requirements
- audit requirements
- success metrics
- fallback behavior

---

## 9. Integration Readiness and Intent Dependency Mapping

Intent onboarding MUST determine whether required systems are available.

### 9.1 Dependency Types

- user context
- organizational context
- external integration
- MCP capability
- governed surface
- document/research corpus
- identity/auth binding

### 9.2 Rule
An intent MUST NOT advance to execution if required dependencies are absent unless the playbook explicitly supports partial execution.

---

## 10. Intent Discovery Inputs

Intent Discovery MAY use:

- existing platform skills
- approved MCP integration library
- approved internal code/assets
- approved external repository metadata
- governance documents
- existing playbooks
- prior execution histories

### 10.1 Raw Code Restriction

Raw code or unvetted repositories MUST NOT be executed directly in the core OS environment.

Any discovered code path MUST pass through:
- static analysis
- sandboxed execution environment
- governance review before promotion to reusable system capability

---

## 11. Ingestion Protocol Requirements

When AI OS uses code, repos, or MCP-discovered capabilities to satisfy an unknown intent, the ingestion protocol MUST enforce:

- source identification
- capability classification
- risk classification
- static analysis
- dependency review
- sandbox isolation
- no ambient access to primary control planes
- promotion review before reuse at scale

### 11.1 Promotion Rule

A discovered capability MAY assist a single exploratory session under sandboxed conditions.

A discovered capability MUST NOT become a system-wide reusable capability until it has passed the defined governance path.

---

## 12. Governance and Promotion Path

Unknown intents that become repeatable and valuable MAY be proposed for formalization.

### 12.1 Formalization Targets

- intent registry entry
- playbook
- governed surface
- MCP integration adoption
- amendment
- specification update

### 12.2 Promotion Criteria

Promotion SHOULD require:
- repeatable value
- known prerequisites
- bounded risk
- successful review
- policy compatibility
- auditability

### 12.3 Governed ratification (promotion gate)

Promotion to a reusable system capability MUST follow the governance path defined in this specification and related amendments. In AI OS, **human-in-the-loop** means governed ratification before system-wide promotion—not an ad hoc approval bottleneck without audit trail.

---

## 13. Waiting-State UX and User Transparency

AI OS MUST handle discovery waiting periods explicitly.

### 13.1 Allowed Waiting States

- clarifying intent
- researching methods
- evaluating integrations
- preparing environment
- awaiting decision
- blocked by missing dependency

### 13.2 UX Requirement

The system SHOULD provide:
- current discovery state
- what the system is doing
- what it still needs
- expected next step
- whether the user can continue, pause, or review progress

The system MUST NOT mask research or compilation time as generic idle time.

---

## 14. Security and Risk Controls

### 14.1 No Direct Raw Code Execution
No raw external code may execute directly in the live shell or primary control plane.

### 14.2 Sandboxed Discovery
Discovery execution environments MUST be isolated from:
- production secrets
- primary integration control planes
- unrestricted filesystem access
- unrestricted network access

### 14.3 Policy Enforcement
All discovered workflows remain subject to:
- policy checks
- authority checks
- audit requirements
- promotion controls

---

## 15. Audit Requirements

The system MUST record:

- declared intent
- qualification outcome
- onboarding state changes
- dependencies required
- integrations requested
- discovery actions taken
- sources examined
- capabilities proposed
- execution result
- promotion recommendation

---

## 16. Developer Synchrony

Developers and agents implementing this specification MUST be able to answer:

- Is this a known or unknown intent?
- What onboarding state is active?
- What dependencies are required?
- What control plane is involved?
- What risks are introduced?
- Is this intent eligible for formalization?

---

## 17. Failure Modes

The system MUST explicitly handle:

- ambiguous intent
- unsupported intent
- missing integration
- missing permission
- unsafe ingestion source
- static analysis failure
- sandbox failure
- policy denial
- discovery timeout
- inability to formalize

---

## 18. Cross-Document Impact

This specification is expected to interact with:

- AIOS-SPEC-003 for agent intent emission
- AIOS-SPEC-006 for governed surfaces
- AIOS-SPEC-007 for Workspace-dependent intents
- AIOS-SPEC-009 for the intent primitive and execution model
- AMD-2026-007 for shell affordances, transparency, and policy scaffolding (see **AIOS-SPEC-009** for core primitive)
- future ingestion protocol specification/amendment

---

## 19. Open Questions

- how unknown intent research sessions are persisted
- how discovery results are scored for promotion
- how to expose discovery progress in the shell
- how to represent provisional capabilities safely
- how to bridge from discovery to amendment generation

---

## 20. Implementation alignment (v0.1)

Normative mapping of this specification to the current repository (documentation only; not a commitment to implement every gap in one slice).

| SPEC-008 concept | Current repo behavior | Gap |
|------------------|------------------------|-----|
| Known intent routing | `INTENT_JSON`, [`intentParse.ts`](../../src/governance/intentParse.ts), [`workspaceIntentRouter.ts`](../../src/workspace/workspaceIntentRouter.ts) | Partial — registry/playbooks not unified |
| Shell / OS navigation | [`shellIntentRouter.ts`](../../src/shell/shellIntentRouter.ts), `app.*` intents | No full onboarding state machine for arbitrary intents |
| Workspace onboarding gate | [`workspaceState.ts`](../../src/shell/workspaceState.ts), [`WorkspaceOnboardingSurface.tsx`](../../src/overlays/WorkspaceOnboardingSurface.tsx), [`loadGovernancePayload.ts`](../../src/governance/loadGovernancePayload.ts) | Aligns with integration readiness (§9); not yet full `intent_*` enum |
| Unknown intent / Discovery Mode | Not implemented as a dedicated mode | Future: discovery UI + audit fields §15 |
| Ingestion / sandbox | Out of scope for this repository slice | Explicitly future amendment per §10–11 |

---

## Appendix: Related Documents

| Document | Document ID | Relationship |
|----------|-------------|--------------|
| AIOS Technical Manifesto | AIOS-CORE-001 | constrained_by |
| Agent Integration Protocol | AIOS-SPEC-003 | extends |
| UI Component Registry Standard | AIOS-SPEC-006 | extends |
| Google Workspace Integration Governance | AIOS-SPEC-007 | depends_on |
| Intent Primitive and Execution Model | AIOS-SPEC-009 | extends |
| Shell affordances & intent policy scaffolding | AMD-2026-007 | extends |
| Workspace Model & Governed Interface Surfaces | AMD-2026-005 | constrained_by |

---

**This document is governed by the AIOS Governance Constitution (v1.0).**
