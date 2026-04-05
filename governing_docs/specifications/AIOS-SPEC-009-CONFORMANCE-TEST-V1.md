---
document_id: AIOS-SPEC-009-CONFORMANCE-TEST-V1
version: 1.2.0
status: draft
category: conformance
title: AIOS-SPEC-009 Pre-Ratification Conformance Test Suite
author: Gateway Global AIOS
created: 2026-04-04
last_updated: 2026-04-04
reviewers: []
related_spec: AIOS-SPEC-009
related_amendment: AMD-2026-007
cross_references:
  - AIOS-SPEC-009
  - AMD-2026-007
---

# AIOS-SPEC-009 Pre-Ratification Conformance Test

## Purpose

Validate that the implementation conforms to the **intent primitive and execution model** ([AIOS-SPEC-009 — Intent Primitive and Execution Model](./IntentPrimitiveAndExecutionModel.md)) before ratification of **AIOS-SPEC-009** and related governance (**[AMD-2026-007](../amendments/AMD-2026-007.md)**), especially:

- Intent schema
- Lifecycle (Expression → Resolution → Validation → Execution → Outcome → State update)
- Arbitration and ambiguity
- Composite intents (where implemented)
- Persistence across modalities
- Transparency and governance chain
- UI contract (primary vs operator)
- **Temporal grounding** and **result-set disclosure** for Workspace **mail** and **calendar** (**AIOS-SPEC-009** §6.3.1–6.3.2, **POL-INTENT-004**–**005**)
- **Intent compilation**, **proposal / approval**, and **playbook promotion** where implemented (**AIOS-SPEC-009** §15, **POL-INTENT-006**–**007**)

This suite aligns directly with **AIOS-SPEC-009** and the intent layer in **AMD-2026-007** §11.

---

## Pass / fail rule

**Ratification-ready** means:

- [ ] No **P0** failures
- [ ] No unresolved ambiguity in intent resolution for tested flows
- [ ] No happy-path flow **requiring** raw IDs or transport details in the **primary** surface
- [ ] All **write-plane** actions gated by policy / confirmation as specified
- [ ] All tested **modalities** feed the **same** intent model (resolver path)
- [ ] **No silent unbounded** mail or calendar execution when **temporal grounding** is required (**TG1**, **TG2**)

---

## 1. Test structure

Run the suite in **nine** sections:

| § | Section |
|---|---------|
| A | Intent schema conformance |
| B | Lifecycle conformance |
| C | Multi-modal convergence |
| D | Arbitration and ambiguity handling |
| E | Composite intent handling |
| F | Intent state persistence |
| G | UI contract conformance |
| H | Transparency and governance |
| I | Temporal grounding and result-set disclosure (Workspace mail / calendar) |

---

## 2. Test harness requirements

A lightweight **debug / operator** layer SHOULD expose, for each interaction, a structured envelope such as:

```json
{
  "rawInput": "...",
  "modality": "voice|chat|menu|system",
  "resolvedIntent": {
    "id": "",
    "domain": "",
    "outcome": "",
    "actor": { "id": "", "role": "" },
    "plane": "read|draft|write",
    "capabilities": [],
    "constraints": [],
    "confidence": 0,
    "temporalScope": {
      "start": "",
      "end": "",
      "preset": "today|yesterday|last_7_days|this_week|this_month|all_time|custom",
      "isExplicit": false,
      "isDefaulted": false
    }
  },
  "validation": {
    "actorAllowed": true,
    "capabilitiesReady": true,
    "policyResult": "allow|deny|confirm"
  },
  "execution": {
    "playbookUsed": "",
    "steps": []
  },
  "ui": {
    "renderedOutcomeView": true,
    "requiredRawId": false,
    "showedTransportDetails": false
  },
  "state": {
    "activeIntentId": "",
    "intentPersisted": true
  }
}
```

This MAY live in an **operator-only** trace panel, consistent with **AIOS-SPEC-009** §10–12 (primary vs operator).

---

## 3. Section A — Intent schema conformance

### Test A1 — Minimum schema exists

**Input:** User says: *Show me emails I need to respond to*

**Expected:** Resolved intent contains all required fields per **AIOS-SPEC-009** §5:

- [ ] `id`
- [ ] `domain`
- [ ] `outcome`
- [ ] `actor` (with identity binding per policy)
- [ ] `plane`
- [ ] `capabilities`
- [ ] `constraints`
- [ ] `confidence`

**Fail if:**

- [ ] Any required field missing
- [ ] Intent stored as plain string only
- [ ] Actor omitted

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test A2 — Plane classification

**Inputs:**

1. *Show me unread emails*
2. *Draft a reply to this email*
3. *Send this reply*

**Expected planes:** (1) `read` — (2) `draft` — (3) `write`

- [ ] (1) classified as read
- [ ] (2) classified as draft
- [ ] (3) classified as write

**Fail if:**

- [ ] Draft treated as write
- [ ] Write treated as read
- [ ] Inconsistent plane assignment across runs

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test A3 — Capability attachment

**Input:** *Show me my calendar for tomorrow*

**Expected:**

- [ ] Intent includes capability references appropriate to **calendar read** behavior

**Fail if:**

- [ ] No capabilities attached
- [ ] Unrelated capabilities attached

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

## 4. Section B — Lifecycle conformance

Lifecycle (**AIOS-SPEC-009** §6): **Expression → Resolution → Validation → Execution → Outcome → State update**

### Test B1 — Full lifecycle present

**Input:** *Review my unread emails*

**Expected trace:**

- [ ] Expression captured
- [ ] Resolved intent produced
- [ ] Validation logged
- [ ] Execution performed
- [ ] Outcome rendered
- [ ] State updated

**Fail if:**

- [ ] Direct execution without validation
- [ ] No state update
- [ ] Primary UI rendered before intent resolved (outcome-first violated)

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test B2 — Validation failure halts execution

**Input:** Use a role **without** mail access; say: *Show me my unread emails*

**Expected:**

- [ ] Intent resolves (or partial resolution per product rules)
- [ ] Validation fails
- [ ] No execution
- [ ] UI shows **blocked** state with clear reason

**Fail if:**

- [ ] System attempts execution anyway
- [ ] No clear blocked reason

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

## 5. Section C — Multi-modal convergence

**AMD-2026-007** / **AIOS-SPEC-009**: voice, chat, menu, and system triggers feed the **same** intent lifecycle.

### Test C1 — Same intent across modalities

**Inputs:**

1. **Voice:** *Show my unread emails*
2. **Chat:** *Show my unread emails*
3. **Menu:** click entry equivalent to “Review unread” (per menu catalog)
4. **System trigger:** e.g. morning workspace briefing (if implemented)

**Expected:** Each resolves into:

- [ ] Same **domain** or equivalent
- [ ] Same **outcome class**
- [ ] Same **plane**
- [ ] Same or equivalent **playbook**

**Fail if:**

- [ ] Voice uses one intent model, chat another
- [ ] Menu bypasses resolver
- [ ] System trigger bypasses policy

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

## 6. Section D — Arbitration and ambiguity handling

### Test D1 — Low ambiguity, single resolution

**Input:** *Show me today’s meetings*

**Expected:**

- [ ] Single calendar **read** intent
- [ ] No unnecessary disambiguation step

**Fail if:**

- [ ] Unnecessary disambiguation
- [ ] Random intent switching across runs

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test D2 — High ambiguity, disambiguation required

**Input:** *Check my schedule and emails*

**Expected** (one of):

- [ ] Composite intent **or**
- [ ] Disambiguation prompt **or**
- [ ] Ranked primary intent with rationale visible in **operator** trace

**Fail if:**

- [ ] Arbitrary execution of only one branch with no explanation
- [ ] Two write actions launched automatically
- [ ] Inconsistent result across runs

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test D3 — Write-plane ambiguity must not auto-execute

**Input:** *Send the follow-up and schedule something*

**Expected:**

- [ ] Draft or **confirm** stage before writes
- [ ] Explicit user confirmation before **write** actions

**Fail if:**

- [ ] Email sent automatically
- [ ] Meeting created automatically without confirmation (when policy requires it)

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

## 7. Section E — Composite intent handling

### Test E1 — Composite read intent

**Input:** *Prepare my day*

**Expected:**

- [ ] Composite intent with sub-intents (e.g. calendar, priority mail, pending replies) **or** explicit “not yet implemented” with no fake success
- [ ] Single **primary** outcome: day briefing (when implemented)
- [ ] Single audit / trace story (operator)

**Fail if:**

- [ ] Treated as generic chat only with no structured intent
- [ ] Sub-intents have disconnected traces
- [ ] No single outcome view when composite is claimed

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test E2 — Cross-domain composite with draft action

**Input:** *Find the email from John and draft a meeting response*

**Expected:**

- [ ] Mail search / selection sub-intents as applicable
- [ ] Output remains **draft**, not committed **send** unless user confirms

**Fail if:**

- [ ] Direct send
- [ ] Separate unrelated views with no orchestration

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

## 8. Section F — Intent state persistence

### Test F1 — Follow-up refinement

**Step 1:** *Show me emails I need to respond to*  
**Step 2:** *Just the ones from today*

**Expected:**

- [ ] Step 2 **refines** active intent context (mail task), not full reset

**Fail if:**

- [ ] Second step loses mail context
- [ ] System asks user to restate full task unnecessarily

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test F2 — Cross-modality persistence

**Step 1 (voice):** *Show unread emails*  
**Step 2 (chat):** *Only from finance*

**Expected:**

- [ ] Intent context persists from voice into chat

**Fail if:**

- [ ] Context reset on modality switch

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test F3 — Explicit reset

**Step 1:** *Show unread emails*  
**Step 2:** *Never mind, show my calendar*

**Expected:**

- [ ] Dominant intent **replaced** cleanly (calendar), stale mail filters do not bleed

**Fail if:**

- [ ] Blended stale state
- [ ] Mail filters incorrectly affect calendar flow

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

## 9. Section G — UI contract conformance

### Test G1 — Outcome-first rendering

**Input:** *Review unread emails*

**Expected primary UI:**

- [ ] Result cards / summaries
- [ ] Next valid actions (under policy)

**Must not show by default (primary):**

- [ ] Raw JSON as main content
- [ ] Message ID paste box as **only** path
- [ ] MCP method names
- [ ] Transport tutorial text

**Fail if:**

- [ ] User must first pick a tool for happy path
- [ ] User must paste ID for happy path
- [ ] Raw payload is primary content

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test G2 — Intent label present when helpful

**Input:** *Show emails needing response*

**Expected:**

- [ ] UI **may** display orientation (e.g. *Intent: Review emails requiring response*) when helpful

**Fail if:**

- [ ] No orientation in complex flow **and** user cannot tell what task the system is executing

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test G3 — Operator trace stays secondary

**Expected:**

- [ ] Audit IDs, transport, payload details accessible in **operator** surface
- [ ] Not interleaved as default primary flow

**Fail if:**

- [ ] Operator data interleaved into normal user flow without policy

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

## 10. Section H — Transparency and governance

### Test H1 — State disclosure

**Expected visible disclosure (where product implements):**

- [ ] Actor or role
- [ ] Lane state
- [ ] Auth state (distinct from vague “connected”)
- [ ] Adapter health
- [ ] Capability readiness
- [ ] Current intent summary where applicable

**Fail if:**

- [ ] Single ambiguous “connected” only
- [ ] Missing auth distinction when relevant
- [ ] No intent state visibility when a resolved intent exists

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test H2 — Governance chain traceability

**Input:** *Send this reply* (write plane)

**Expected in operator trace:**

- [ ] Actor validation
- [ ] Domain validation
- [ ] Capability resolution
- [ ] Policy enforcement
- [ ] Execution record

**Fail if:**

- [ ] Execution without trace
- [ ] Policy decision absent
- [ ] No confirmation record for write plane when required

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test H3 — Policy block enforcement

**Input:** Attempt **forbidden** write with insufficient role.

**Expected:**

- [ ] Blocked **before** execution
- [ ] User-facing explanation
- [ ] Trace shows policy denial

**Fail if:**

- [ ] Soft warning but action still runs
- [ ] Hidden failure with no explanation

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

## 11. Section I — Temporal grounding and result-set disclosure (Workspace mail / calendar)

Normative refs: **AIOS-SPEC-009** §6.3.1 (temporal grounding), §6.3.2 (result-set disclosure), §5 `TemporalScope`; **POL-INTENT-004**, **POL-INTENT-005**.

### Test TG1 — Unbounded mail request must trigger period grounding

**Input:** *Check my emails* (or equivalent unbounded phrasing)

**Expected:**

- [ ] **No** immediate execution over an **unbounded** corpus as if the task were complete
- [ ] **One of:** user prompted for period **or** governed default applied **with disclosure** **or** bounded options (today / last 7 days / …)
- [ ] If volume is known or estimable, **disclosure** consistent with **§6.3.2** (e.g. approximate count + need for range)

**Fail if:**

- [ ] Silent full-mailbox query presented as a complete “review” without grounding
- [ ] False confidence that the vague request was fully satisfied

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test TG2 — Unbounded calendar request must trigger period grounding

**Input:** *Review my calendar* / *What’s on my calendar?* (when no period is in context)

**Expected:**

- [ ] Period grounding: today / this week / this month / custom **or** governed default **with disclosure**
- [ ] No silent “whole calendar history” as default without user alignment

**Fail if:**

- [ ] Unbounded calendar query executed without grounding or disclosure

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test TG3 — Explicit all-time / full-corpus request may bypass narrowing

**Input:** *Check all of my emails for invoices* (explicit full-corpus or broad scope)

**Expected:**

- [ ] System **may** execute or plan execution across the **full** corpus because scope was **explicit**
- [ ] **POL-INTENT-004** still allows policy limits (timeouts, caps) — document if waived

**Fail if:**

- [ ] System invents a narrow window **contrary** to explicit “all” intent without confirmation

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

### Test TG4 — Session date context grounds follow-up

**Step 1:** *Show me emails from the last 7 days*  
**Step 2:** *Now just from John*

**Expected:**

- [ ] Step 2 **inherits** `TemporalScope` (last 7 days) unless user overrides period
- [ ] Refinement does **not** reset to unbounded mail

**Fail if:**

- [ ] Second step loses temporal context
- [ ] Unbounded query replaces grounded scope without user intent

**Result:** ☐ Pass ☐ Fail — **Notes:**

---

## 12. Scorecard — P0 / P1 / P2

### P0 — Must pass before ratification

| ID | Test |
|----|------|
| ☐ | **A1** Minimum schema |
| ☐ | **A2** Plane classification |
| ☐ | **B1** Full lifecycle |
| ☐ | **B2** Validation halts execution |
| ☐ | **C1** Multi-modal convergence |
| ☐ | **D3** Write ambiguity (no auto-execute) |
| ☐ | **F1** Follow-up refinement |
| ☐ | **G1** Outcome-first / no raw ID primary |
| ☐ | **H1** State disclosure |
| ☐ | **H2** Governance chain trace |
| ☐ | **H3** Policy block |
| ☐ | **TG1** Mail temporal grounding |
| ☐ | **TG2** Calendar temporal grounding |

### P1 — Strongly recommended

| ID | Test |
|----|------|
| ☐ | **A3** Capability attachment |
| ☐ | **D1** Low ambiguity |
| ☐ | **D2** High ambiguity |
| ☐ | **E1** Composite read |
| ☐ | **F2** Cross-modality persistence |
| ☐ | **F3** Explicit reset |
| ☐ | **G2** Intent label |
| ☐ | **G3** Operator secondary |
| ☐ | **TG3** Explicit all-time / full-corpus |
| ☐ | **TG4** Session inherits temporal scope |

### P2 — Maturity / polish

| ID | Test |
|----|------|
| ☐ | **E2** Cross-domain composite + draft |
| ☐ | Advanced confidence display |
| ☐ | Richer operator trace |
| ☐ | Primary-surface **period / count / filter** chips (Workspace) |

---

## 13. Manual script (run in order)

Use these prompts in sequence; for each step capture: resolved intent (or stub), plane, validation occurred, outcome without tool selection, raw ID/transport leakage, state persistence.

```text
1. Show me unread emails
2. Just the ones from today
3. Show me today's meetings
4. Check my schedule and emails
5. Prepare my day
6. Draft a reply to the first email
7. Send it
8. Find the email from John and draft a meeting response
9. Never mind, show my calendar
```

| Step | Pass | Notes |
|------|------|-------|
| 1 | ☐ | |
| 2 | ☐ | |
| 3 | ☐ | |
| 4 | ☐ | |
| 5 | ☐ | |
| 6 | ☐ | |
| 7 | ☐ | |
| 8 | ☐ | |
| 9 | ☐ | |

---

## 14. Ratification bar (summary)

Before ratifying **AIOS-SPEC-009**, evidence SHOULD show:

- [ ] **One** intent model (schema + resolver path)
- [ ] **One** lifecycle (instrumented)
- [ ] **One** governance chain (traceable on writes)
- [ ] **One** UI contract (primary vs operator)
- [ ] **One** persistence model (cross-modality unless policy clears)
- [ ] **Temporal executability** for Workspace mail/calendar: no silent unbounded queries when **POL-INTENT-004** applies; disclosure/narrowing per **POL-INTENT-005**
- [ ] **Execution plans**: unverified writes/multi-step plans gated per **POL-INTENT-006**; promotion auditable per **POL-INTENT-007** when playbook learning ships

Composite flows **E1/E2** may be partial; **P0** must be clean.

---

## 15. Reviewer sign-off

| Field | Value |
|-------|--------|
| **Product / governance owner** | |
| **Technical reviewer** | |
| **Date** | |
| **Build / commit** | |
| **Environment** (e.g. local, staging) | |

**Declaration:** We confirm that **P0** conformance tests were executed and results recorded; known gaps are listed below and do not block ratification only if explicitly waived.

**Waivers (if any):**

| Test ID | Waiver reason | Approver |
|---------|----------------|----------|
| | | |

**Signatures**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| | | | |
| | | | |

---

**End of AIOS-SPEC-009-CONFORMANCE-TEST-V1**
