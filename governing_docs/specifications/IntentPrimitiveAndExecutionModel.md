---
document_id: AIOS-SPEC-009
version: 0.5.0
status: draft
category: specification
title: Intent Primitive and Execution Model
author: Gateway Global AIOS
created: 2026-04-04
last_updated: 2026-04-04
reviewers: []
ratification_target: null
supersedes: null
cross_references:
  - AIOS-SPEC-006
  - AIOS-SPEC-007
  - AIOS-SPEC-008
  - AIOS-SPEC-009-CONFORMANCE-TEST-V1
  - AMD-2026-007
  - AMD-2026-008
  - OLLAMA_RUNTIME_STANDARD
  - WHISPER_RUNTIME_STANDARD
  - LOCAL_TTS_RUNTIME_STANDARD
amendment_history:
  - version: 0.5.0
    date: 2026-04-04
    summary: Added §17 Sovereign voice and local runtime lanes (STT, interpretation cross-ref, TTS); WHISPER_RUNTIME_STANDARD and LOCAL_TTS_RUNTIME_STANDARD cross-references.
  - version: 0.4.0
    date: 2026-04-03
    summary: Added §16 Local interpretation lane and Ollama runtime; POL-MODEL-001–004.
---

# AIOS-SPEC-009 — Intent Primitive and Execution Model

## 0. Status and ratification

| Field | Value |
|-------|--------|
| **Status** | `draft` |
| **Ratification** | Requires alignment with **AMD-2026-007** §11; **AIOS-SPEC-008** **MUST** reference or merge this spec; **AIOS-SPEC-007** **MUST** enforce this spec at the integration layer |

This specification defines the **core primitive of the AI OS: Intent**.

All routing, UI, policy, voice interaction, and capability execution **MUST** conform to this model.

**Relationship to AMD-2026-007:** Amendment **AMD-2026-007** §11 and this specification **MUST** remain aligned; on conflict, **governance process** determines precedence (typically: ratified spec over draft AMD section, or merged text in a single revision).

---

## 1. Purpose

Define a **single, canonical model for intent** that:

1. Serves as the **governed execution primitive** for the AI OS.
2. Unifies all input modalities (voice, chat, menu, system triggers).
3. Anchors governance, capability execution, and UI rendering.
4. Prevents drift across agents, interfaces, and integrations.
5. Enables deterministic, auditable system behavior.
6. Supports **intent compilation** into **execution plans**, **human-in-the-loop approval** where required, **verification**, and **promotion** to reusable playbooks (**§15**).

---

## 2. Scope

**In scope**

- Intent definition and schema.
- Intent lifecycle.
- Resolution and arbitration.
- Composition (multi-intent orchestration).
- State persistence.
- Governance enforcement at the intent layer.
- UI contract tied to intent.
- **Temporal grounding** and **result-set disclosure** for **time-indexed** Workspace domains (at minimum **mail** and **calendar**).
- **Intent compilation**, **proposal / approval**, **execution**, **verification**, and **playbook promotion** (**§15**) — the bridge between intent, capability registry, governance, and long-term system learning.

**Out of scope**

- Vendor-specific integrations.
- UI styling or component design (covered in **AIOS-SPEC-006**).
- Domain-specific playbooks (covered in domain packs).

---

## 3. Definitions

| Term | Definition |
|------|------------|
| **Intent** | A structured, governed declaration of a desired outcome. |
| **Resolved intent** | An intent that has passed resolution and is ready for validation or execution. |
| **Composite intent** | An intent composed of multiple subordinate intents. |
| **Intent state** | The active intent context within a session. |
| **Plane** | Execution classification: `read`, `draft`, `write`. |
| **Time-indexed domain** | A domain whose primary datasets are naturally ordered or filtered by **time** (e.g. mail message dates, calendar event start/end). |
| **Temporal grounding** | Determination of a **bounded time window** (or explicit **all-time** scope) so that a query over a time-indexed domain is **executable** and not falsely confident over an unbounded corpus. |
| **Intent grounding (generic)** | Actor, object, domain, policy, capability, and **session context** — extended in Workspace by **domain-specific** fields (e.g. **time period**, sender, status). |

---

## 4. Intent (normative definition)

**Intent** is a structured, governed declaration of a desired outcome **within a domain**, expressed by an **actor**, **resolved** into permissible actions, and **executed** through **controlled capabilities** under **policy**.

---

## 5. Intent schema (required)

```ts
interface Intent {
  id: string;
  domain: string;
  outcome: string;
  actor: Actor;
  plane: "read" | "draft" | "write";
  capabilities: string[];
  constraints: string[];
  confidence: number;
  /** Required for time-indexed Workspace intents when §6.3.1 applies — see TemporalScope. */
  temporalScope?: TemporalScope;
}

interface Actor {
  id: string;
  role: string;
}

/** Bounds the executable dataset for mail, calendar, and other time-indexed domains. */
interface TemporalScope {
  start?: string;
  end?: string;
  preset?:
    | "today"
    | "yesterday"
    | "last_7_days"
    | "this_week"
    | "this_month"
    | "all_time"
    | "custom";
  /** User explicitly stated the period or “all mail”. */
  isExplicit: boolean;
  /** System applied a governed default window and disclosed it. */
  isDefaulted: boolean;
}
```

### Requirements

- **MUST** conform to this minimum structure.
- **MAY** extend with additional metadata (e.g. playbook id, audit correlation id) without violating **POL-INTENT-001**.
- **MUST NOT** be treated as an unstructured string bag for governed execution paths.
- For **time-indexed** Workspace intents to which **§6.3.1** applies, **MUST** either populate **`temporalScope`** per resolution or **block execution** until grounding completes (**POL-INTENT-004**).

---

## 6. Intent lifecycle (normative)

```text
Expression → Resolution → Validation → Execution → Outcome → State update
```

### 6.1 Expression

Intent **MAY** originate from:

- **Voice** (primary where enabled).
- **Chat**.
- **Menu**.
- **System trigger**.

All **MUST** flow into **resolution**.

### 6.2 Resolution

The system **MUST**:

- Classify input into structured intent.
- Assign **domain** and **outcome**.
- Populate required fields per §5.

### 6.3 Resolution arbitration (REQUIRED)

When multiple candidate intents exist, the system **SHALL**:

1. Rank intents by **confidence** and **policy**.
2. Select a **primary** intent **or**
3. Trigger **disambiguation** per product rules.

The system **MUST NOT**:

- Execute **multiple write-plane** intents without **explicit confirmation** when policy requires a single committed write.

### 6.3.1 Temporal grounding for time-indexed domains (REQUIRED)

For **time-indexed domains**, including at minimum **Workspace mail** and **Workspace calendar**, the system **SHALL** determine whether a **temporal filter** is required to make the intent **executable**.

**Temporal grounding** is a **required part of intent grounding** when the target domain is time-indexed and an **unbounded** or **materially over-broad** time range would return a **large** or **operationally non-actionable** result set — unless the user or session has already fixed the slice (**POL-INTENT-004**).

When temporal grounding is required, the system **MUST** satisfy **at least one** of:

1. **Explicit period** — The user stated a time range, **or** explicitly requested **all-time** / full-corpus scope (e.g. *check all of my emails for invoices*).
2. **Session context** — A **valid** `TemporalScope` (or equivalent) already in **active intent state** from a prior turn **and** still applicable.
3. **Governed default** — Apply a **policy-approved default** window and **disclose** it before or as part of outcome presentation.
4. **Bounded choice** — Present **bounded period options** (e.g. today, last 7 days, this month, custom) and **do not** execute the broad query until the user selects or confirms.

The system **MUST NOT** **silently** execute an **effectively unbounded** mail or calendar **read** when **temporal grounding** is required for actionable results (**POL-INTENT-004**).

### 6.3.2 Result-set disclosure and narrowing (REQUIRED)

When a **candidate query** for a time-indexed domain would return a **materially broad** result set, the system **SHALL** **disclose** the **approximate scope** (or volume, when available) and **require or apply narrowing** before presenting the task as **fully executed** or before implying completion (**POL-INTENT-005**).

Examples of disclosure:

- Approximate **message count** or **event count** in the current scope.
- The **bounded date window** actually used.
- **Available refinements** (filters, sender, unread, etc.).

Example behaviors (non-exhaustive):

- *I found about 8,240 emails in your mailbox. To make this actionable, I need a date range (today, last 7 days, …).*  
- *I found 147 events this month. Show today, this week, or a custom range?*

This is **execution gating**, not optional transparency: the system **MUST NOT** present **false confidence** that a vague request has been fully satisfied over an undefined corpus.

### 6.4 Validation

The system **MUST** validate:

- **Actor** permissions.
- **Policy** constraints.
- **Capability** availability.
- **Temporal executability** — For intents under **§6.3.1**, that **`temporalScope`** is present, or explicit **all-time** intent is recorded, or execution remains **blocked** pending grounding.

### 6.5 Execution

- Execute via **control plane** (and adapters as defined by domain packs).
- **MAY** involve multi-step orchestration.

### 6.6 Outcome

- Return **structured** results.
- Render on **primary surface** per §10–11.

### 6.7 State update

- Persist **intent context**.
- Update **session state**.
- Reflect in **composed session summary** (see **AMD-2026-007** and **AIOS-SPEC-007** transparency model).

---

## 7. Intent composition (REQUIRED)

An intent **MAY** resolve into multiple subordinate intents.

### Composite intent rules

A **composite** intent **SHALL**:

- Define a **primary** outcome.
- Maintain a **single audit chain** (per product audit model).
- Orchestrate subordinate intents deterministically under policy.

Sub-intents **MUST**:

- Inherit **actor** context.
- Respect **plane** constraints.
- Execute under **policy**.

---

## 8. Intent state management (REQUIRED)

**Intent state** **SHALL** persist until:

1. Replaced by a new **dominant** intent,
2. **Explicitly** cleared by the user,
3. Cleared by **policy**, or
4. **Session** expires per product rules.

Intent state **MAY**:

- Be refined incrementally.
- Span multiple interactions or modalities (voice ↔ chat ↔ menu).

---

## 9. Governance enforcement model

Governance **SHALL** operate at the intent level:

```text
Intent
  → Actor validation
  → Domain validation
  → Capability resolution
  → Policy enforcement
  → Execution
```

All execution **MUST** be traceable to this chain (**POL-INTENT-002**).

---

## 10. Intent-driven UI contract

The **primary surface** **SHALL**:

1. Display **outcomes**, not raw tools or transport.
2. Present **structured** data.
3. Offer **next valid actions** under policy and capability state.
4. Reflect **intent state**.

### MUST NOT

- Require **raw resource identifiers** for default happy paths where structured search/select exists.
- **Expose transport mechanisms** (e.g. MCP method names, JSON-RPC shapes) as default primary content.
- Require **manual tool selection** when a known playbook defines the path — unless policy requires confirmation.

### SHOULD

- Display an **intent label** or human-readable summary.

Example:

```text
Intent: Review emails requiring response
```

#### Workspace mail / calendar: grounding controls on the primary surface

For **time-indexed** Workspace surfaces, the **primary** outcome view **SHOULD** treat **period**, **range**, and **result count** as **first-class grounding controls** (e.g. chips or filters), not as optional afterthoughts — so the user sees **what slice** is being executed.

Example presentation pattern:

```text
Intent: Review emails
Period: Last 7 days
Results: 48 emails
Filters: From finance · Unread · Has attachment
```

---

## 11. Outcome-first rendering

Upon intent resolution, the system **SHALL**:

- Render the **outcome view** **immediately**.
- Skip **intermediate manual tool selection** for the default path **unless** policy requires confirmation.

---

## 12. Transparency model

The system **SHALL** disclose:

### Actor

- Identity and role.

### System state

- **Lane**
- **Auth**
- **Adapter**
- **Capability readiness**

### Intent state

- **Resolved intent** (summary or id per UX policy)
- **Confidence** (optional when material)

### Operator trace

- **Audit**, **payload**, **transport**

**Operator trace** **MUST** be **accessible** and **MUST NOT** be the **default primary** surface for typical users.

---

## 13. Voice-first AI (normative)

**Voice-first AI** is a system where:

- **Intent** is continuously **captured** and **updated**.
- Interaction is **conversational**.
- **UI** supports but does **not** solely control execution.

---

## 14. Policy alignment

This specification enforces:

- **POL-INTENT-001** (schema)
- **POL-INTENT-002** (governance chain)
- **POL-INTENT-003** (UI contract)
- **POL-INTENT-004** (temporal grounding for time-indexed domains)
- **POL-INTENT-005** (result-set disclosure and narrowing)
- **POL-INTENT-006** (execution plan approval for unverified or sensitive plans)
- **POL-INTENT-007** (playbook promotion after verification)

Defined in **AMD-2026-007** §5.

---

## 15. Intent compilation and approval model (REQUIRED)

This section defines the **governed execution lifecycle** that bridges **intent** (**§4–§6**), **temporal grounding** (**§6.3.1–6.3.2**), the **capability registry**, **policy**, and **long-term learning** via **verified playbooks**.

Normative flow:

```text
Intent
  → Temporal grounding (time-indexed domains — §6.3.1)
  → Intent → Execution plan (skills + actions)
  → User review (proposal) when required — §15.4–15.7
  → Execution
  → Verification
  → Promotion to reusable playbook (optional — §15.6)
```

### 15.1 Temporal bounding before compilation

For **time-indexed domains** (including Workspace **mail** and **calendar**), intents **SHALL** be resolved with an **explicit** or **governed default** `TemporalScope` (**§5**, **§6.3.1**) **before** compilation into an executable plan over that corpus.

The system **MUST**:

1. Require a **user-defined** period, **or**
2. Apply a **governed default** period and **disclose** it,

**before** treating the intent as **fully executable** over that dataset.

The system **MUST NOT** compile or execute **unbounded** time-indexed queries **unless** the user **explicitly** requests full-corpus / all-time scope (aligned with **§6.3.1** and **POL-INTENT-004**).

### 15.2 Intent compilation

A **resolved**, **temporally grounded** (where required) intent **SHALL** be **compiled** into an **execution plan** consisting of **skills** and **actions** mapped to the **capability registry** **before** side-effecting or multi-step execution.

Execution plans **MUST**:

- Map to **registry** entries (capability ids) and concrete adapter/control-plane steps as defined by domain packs.
- Respect **intent plane** (`read` | `draft` | `write`).
- Be **traceable** to **policy** and audit (**POL-INTENT-002**).

### 15.3 Plan structure (normative shape)

```ts
interface ExecutionPlan {
  intentId: string;
  temporalScope: TemporalScope;
  skills: Skill[];
  actions: Action[];
  expectedOutcome: string;
  riskLevel: "low" | "medium" | "high";
  /** Set when plan matches a known verified playbook (§15.7). */
  playbookId?: string;
  verified?: boolean;
}

interface Skill {
  id: string;
  /** Capability registry reference. */
  capabilityRef: string;
}

interface Action {
  id: string;
  description: string;
  kind: "read" | "draft" | "write";
}
```

Implementations **MAY** extend these interfaces with ordering, dependencies, and audit correlation ids.

### 15.4 Proposal requirement

For **new**, **unverified**, or **high-risk** execution plans (per **§15.7**), the system **SHALL** present a **proposal** to the user **before** execution (**POL-INTENT-006**).

The proposal **MUST** include:

- **Interpreted intent** (human-readable).
- **Temporal scope** (or explicit all-time if applicable).
- **Result volume** or scope estimate when available (**POL-INTENT-005**).
- **Planned skills/actions** (summary level acceptable in primary UI; detail in operator trace as needed).
- **Expected outcome** and **risk level**.

### 15.5 Execution gating

The system **MUST NOT** execute:

- **Write-plane** actions,
- **Multi-step composite** actions that have not been approved per **§15.7**, or
- **New or unverified** plans that require explicit approval,

without **user approval** or **policy-based auto-approval** consistent with **§15.7** (**POL-INTENT-006**).

### 15.6 Plan verification and promotion

After execution, the system **SHALL** **evaluate** the outcome against the **expected result** (product-defined verification).

If execution is **successful** and policy allows:

- The plan **MAY** be **promoted** to a **reusable playbook** (**POL-INTENT-007**).
- **Future** executions **MAY** **bypass** full proposal when **§15.7** auto-approval rules apply.

If **unsuccessful**:

- The plan **MUST NOT** be promoted as verified.
- The system **SHOULD** log failure and **SHOULD** support user correction or replay.

This is the **governed skill acquisition loop**: validated behavior becomes **deterministic** and **lower-friction** over time without abandoning auditability.

### 15.7 Auto-approval rules (normative table)

Not every plan requires a full proposal. The system **SHALL** apply rules at least as strict as:

| Case | Behavior |
|------|----------|
| **Known verified playbook** + **read** plane | **MAY** auto-execute (no proposal) if policy allows |
| **Known verified playbook** + **draft** plane | **MAY** auto-execute with **preview** or short confirmation per policy |
| **Known verified playbook** + **write** plane | **SHALL** require **explicit confirmation** unless policy defines a narrower auto-approve (documented) |
| **New or unverified plan** | **SHALL** **propose** before execute (**POL-INTENT-006**) |

Domain packs **MAY** refine this table; **MUST NOT** weaken **write-plane** or **unverified-plan** protections without governance amendment.

---

## 16. Local interpretation lane and Ollama runtime (REQUIRED)

This section defines the **model execution lane** for **interpretation** of retrieved Workspace content (mail, calendar, and related text). It is **normative** for product implementations that claim **sovereign** or **local-first** interpretation.

**Separation of concerns**

- **Retrieval** (e.g. Gmail MCP: search, message read, thread content, draft creation) **MUST** remain distinct from **interpretation** (summarization, classification, extraction, proposed reply bullets).
- **Interpretation** **SHALL NOT** be conflated with **Gemini** or any remote model **by default** for Workspace mail/calendar content unless **§16.4** fallback rules apply.

### 16.1 Normative requirements

For **Workspace interpretation tasks**, including at minimum **email thread summarization**, **action extraction**, and **classification**, the system **SHALL** prefer the **Local Interpretation Lane** when the product environment **declares it available**.

The **Local Interpretation Lane** **SHALL** be backed by a **documented local runtime**, initially **Ollama** (see **[OLLAMA_RUNTIME_STANDARD.md](../operations/OLLAMA_RUNTIME_STANDARD.md)**), and **SHALL** expose **readiness state** before use.

The system **MUST NOT** silently substitute a **remote** model for a task designated **local-first** unless **policy explicitly allows fallback** and the **user or operator** can determine that fallback occurred (**§16.4**).

A **local interpretation capability** **SHALL** be considered **unavailable** when any of the following hold:

1. The runtime binary is **not installed**.
2. The local runtime **service** is **not reachable** at the configured endpoint.
3. The **required model** is **not present** (pull / load failed).
4. **Policy** disables local inference for the current **environment** or **actor class**.

When local interpretation is unavailable, the system **MUST** surface a **disclosed** state (see **[OLLAMA_RUNTIME_STANDARD.md](../operations/OLLAMA_RUNTIME_STANDARD.md)** — readiness states). Missing Ollama **MUST NOT** be treated as a **silent** fallback to a remote model.

### 16.2 Default model policy (Workspace content)

**POL-MODEL-001**
Local interpretation tasks **SHALL** use the **approved local runtime** when **available** and **policy-enabled**.

**POL-MODEL-002**
The system **SHALL** disclose **local model readiness** and **MUST NOT** silently treat a missing runtime as **available** for inference.

**POL-MODEL-003**
Fallback from **local** to **remote** inference **SHALL** require **explicit policy allowance** and **SHALL** be **auditable** (operator trace or equivalent).

**POL-MODEL-004**
Workspace **mail** and **calendar** content interpretation **SHALL** default to the **Local Interpretation Lane** unless an **exception** is documented in policy or environment.

### 16.3 Capability registry (informative shape)

Domain packs (e.g. **AIOS-SPEC-007** / **WORKSPACE.md**) **SHOULD** register interpretation capabilities with at least:

| Field | Meaning |
|-------|--------|
| `id` | e.g. `local.llm.summarize`, `local.llm.classify`, `local.llm.extract_actions`, `local.llm.propose_reply` |
| `domain` | e.g. `workspace.mail`, `workspace.calendar` |
| `plane` | `read` for interpretation-only outputs |
| `modelLane` | `local` \| `remote` (remote only when policy allows) |
| `runtime` | e.g. `ollama` |
| `fallbackPolicy` | e.g. `block`, `proposal_required`, `policy_allow_remote` |
| `ui` | `primaryAllowed`, disclosure requirements |

Interpretation capabilities **MUST NOT** be marked **enabled** unless **readiness checks** pass (**§16.1**).

### 16.4 Remote / cloud fallback (Gemini and others)

**Remote** models (including **Gemini** via **@google/genai** or gateway APIs) **MAY** be used when:

1. The **user** explicitly chooses **cloud assistance**, or
2. **Policy** allows remote inference for the **task** and **environment**, or
3. A **documented** capability fallback applies (e.g. context length or quality threshold), **and** the user or operator is **informed** that **remote** inference ran.

The system **SHOULD** prefer **local** first, then **offer** escalation (e.g. “Use cloud summarization for this thread?”) when local is unavailable or insufficient, rather than **silent** substitution.

**Voice / live** customer-facing layers **MAY** use Gemini **or** other models per product spec **for features not governed by §17**; that path **MUST NOT** override **§16.1** for **default** Workspace mail/calendar interpretation without policy alignment. Where the product claims **sovereign voice** (§17), **remote** STT/TTS **MUST NOT** substitute silently — see **§17.3** and **§17.5**.

### 16.5 Non-goals for local interpretation

The local runtime **MUST NOT** be used **by default** for:

- **Direct** policy decisions (allow/deny execution plans) — **policy engines** remain separate.
- **Uncontrolled** execution planning — **§15** still applies.
- **Sending** email or **irreversible** writes — those remain **Gmail tools** + **§15** gating.

---

## 17. Sovereign voice and local runtime lanes (REQUIRED)

This section defines **three** separable **local runtime lanes** for products that claim **sovereign**, **local-first**, or **air-gapped** voice and language behavior. It is **normative** where those claims appear in product, marketing, or policy.

**Lanes (conceptual)**

| Lane | Role | Approved default runtime (initial) | Normative operations standard |
|------|------|-----------------------------------|------------------------------|
| **Speech-input** | Convert user audio to text (**STT**) for intent routing and UI | **Whisper** / **faster-whisper** (local process) | **[WHISPER_RUNTIME_STANDARD.md](../operations/WHISPER_RUNTIME_STANDARD.md)** |
| **Interpretation** | Structured inference over **retrieved** text (summarize, classify, extract, propose) | **Ollama** | **§16**; **[OLLAMA_RUNTIME_STANDARD.md](../operations/OLLAMA_RUNTIME_STANDARD.md)** |
| **Speech-output** | Convert assistant text to audio (**TTS**) for playback | **Local TTS** (engine per **[LOCAL_TTS_RUNTIME_STANDARD.md](../operations/LOCAL_TTS_RUNTIME_STANDARD.md)**) | **[LOCAL_TTS_RUNTIME_STANDARD.md](../operations/LOCAL_TTS_RUNTIME_STANDARD.md)** |

**Separation of concerns**

- **Retrieval** (MCP, Workspace tools) remains **§16** / **AIOS-SPEC-007** — unchanged.
- **Interpretation** of retrieved content remains **§16** — unchanged.
- **Voice capture and playback** for **sovereign** product modes **SHALL** use the **speech-input** and **speech-output** lanes when those modes are **declared**, not ad hoc remote APIs.

### 17.1 Normative requirements (sovereign voice)

Where the environment or product **declares** sovereign or local-first **voice**:

1. **Speech-input** **SHALL** use the **approved local STT path** (see **WHISPER_RUNTIME_STANDARD**) when that path is **`running_ready`**; when it is **not**, **§17.4** governs fallback and proposals — **no** silent remote STT.
2. **Interpretation** **SHALL** follow **§16** (Ollama / local LLM) for Workspace text interpretation — **not** conflated with STT.
3. **Speech-output** **SHALL** use the **approved local TTS path** (see **LOCAL_TTS_RUNTIME_STANDARD**) when **`running_ready`**; when **not**, **§17.4** applies — **no** silent remote TTS.

**POL-LANE-VOICE-001**  
The system **MUST NOT** **silently** substitute **remote** STT, **remote** TTS, or **remote** interpretation for a task designated **local / sovereign** for that lane. Substitution **SHALL** require **explicit** policy allowance and **disclosure** (operator trace or user-visible notice) — aligned with **POL-MODEL-002** / **POL-MODEL-003** semantics for the interpretation lane.

**POL-LANE-VOICE-002**  
Each lane **SHALL** expose **readiness** (see respective runtime standards) before the UI claims **available** for that lane.

**POL-LANE-VOICE-003**  
Fallback to **cloud** STT/TTS **MAY** occur only when **policy** allows and the **user** or **operator** can determine that **remote** processing ran (audit / disclosure).

### 17.2 Capability identifiers (informative)

Domain packs (**WORKSPACE.md**, shell, voice router) **SHOULD** register capabilities including at least:

| Capability id | Lane | Notes |
|-----------------|------|--------|
| `local.stt.transcribe` | Speech-input | Local STT; **no** silent remote. |
| `local.tts.speak` | Speech-output | Local TTS; **no** silent remote. |
| `local.llm.*` | Interpretation | Per **§16.3** and **OLLAMA_RUNTIME_STANDARD**. |

### 17.3 Speech-input lane (Whisper / faster-whisper)

- **Whisper** (OpenAI weights) and **faster-whisper** (CTranslate2) are the **initial approved** local STT implementations for sovereign speech-input; other engines **MAY** be added by **governance amendment** and a **named** runtime standard.
- **SHALL** conform to **[WHISPER_RUNTIME_STANDARD.md](../operations/WHISPER_RUNTIME_STANDARD.md)** for installation, readiness, fallback, disclosure, and data handling.

### 17.4 Unified fallback and proposals

If **any** of the three lanes is **not** `running_ready`, the system **SHALL** **block** silent escalation to **remote** STT/TTS for sovereign modes **or** present a **proposal** (e.g. “Use cloud transcription for this session?”) per policy — **never** silent substitution.

### 17.5 Speech-output lane (local TTS)

- **Local TTS** **SHALL** conform to **[LOCAL_TTS_RUNTIME_STANDARD.md](../operations/LOCAL_TTS_RUNTIME_STANDARD.md)** for installation, readiness, fallback, disclosure, and data handling.

### 17.6 Non-goals

- This section **MUST NOT** require local STT/TTS for products that **do not** claim sovereign voice (remote-only products **MAY** use vendor APIs per separate product spec).
- **MUST NOT** merge STT/TTS with **Workspace MCP retrieval** — audio pipelines are **separate** from Gmail/Drive tool calls.

---

## 18. Cross-spec requirements

### AIOS-SPEC-008

**MUST** reference or merge this specification for the **intent primitive**, **lifecycle**, and **compilation/promotion** alignment with discovery and onboarding.

### AIOS-SPEC-007

**MUST** enforce intent at the **Workspace integration** layer (routes, transparency, capability binding, **execution plans** for Workspace tools).

**MUST** align **local interpretation** capabilities and **readiness** with **§16** and **[OLLAMA_RUNTIME_STANDARD.md](../operations/OLLAMA_RUNTIME_STANDARD.md)**.

**SHOULD** align **local STT/TTS** capability ids in **WORKSPACE.md** with **§17** and the **WHISPER_RUNTIME_STANDARD** / **LOCAL_TTS_RUNTIME_STANDARD** documents.

### AIOS-SPEC-006

**MUST** align **UI components** (command rail, operator trace, primary surfaces, **proposal** surfaces) with **§10–13** and **§15** of this specification.

**SHOULD** surface **local model readiness** and **fallback disclosure** per **§16** and **POL-MODEL-002**.

**SHOULD** surface **speech-input** and **speech-output** readiness when **§17** sovereign voice is in scope, per **WHISPER_RUNTIME_STANDARD** and **LOCAL_TTS_RUNTIME_STANDARD**.

---

## 19. Implementation alignment (informative)

Non-exhaustive implementation loci (repository may differ):

- **Type layer (this repo):** [`src/intent/spec009Types.ts`](../../src/intent/spec009Types.ts) (`Intent`, `TemporalScope`, `ExecutionPlan`, `VerificationStatus`, `PromotionMetadata`), [`src/intent/executionPlanPolicy.ts`](../../src/intent/executionPlanPolicy.ts) (`evaluateExecutionPlan` — POL-INTENT-006 / §15.7).
- Intent resolver / router / **compiler** (intent → `ExecutionPlan`)
- Intent registry and **capability registry**
- Workspace policy
- Control plane execution
- **Local interpretation lane** (Ollama readiness, **§16**, **POL-MODEL-001**–**004**)
- **Sovereign voice lanes** (**§17**, Whisper / local TTS readiness when wired)
- UI rendering, **proposal** flows, and shell chrome

---

## 20. Ratification checklist

- [ ] Governance approval
- [ ] **AIOS-SPEC-008** alignment
- [ ] **AIOS-SPEC-007** enforcement
- [ ] Policy registration (**POL-INTENT-001**–**007**, **POL-MODEL-001**–**004**)
- [ ] UI contract and **§15** proposal/promotion implementation
- [ ] **§16** local interpretation lane and **OLLAMA_RUNTIME_STANDARD** operational alignment
- [ ] **§17** sovereign voice and local runtime lanes (STT/TTS standards when product claims sovereign voice)
- [ ] **Pre-ratification conformance:** **[AIOS-SPEC-009-CONFORMANCE-TEST-V1](./AIOS-SPEC-009-CONFORMANCE-TEST-V1.md)** — P0 tests passed or waivers recorded with sign-off

---

## 21. Conformance evidence (informative)

Before ratifying this specification, run the **[AIOS-SPEC-009 Pre-Ratification Conformance Test Suite](./AIOS-SPEC-009-CONFORMANCE-TEST-V1.md)** (manual first, then automate P0 cases against resolver, policy, and UI). The suite defines pass/fail rules, P0/P1/P2 tiers, a manual prompt script, and reviewer sign-off.

---

**End of AIOS-SPEC-009**
