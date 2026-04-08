# Pilot — Phase 1 conformance (filled example)

**Role:** Canonical pattern for clause-backed issues. Copy structure into your tracker; keep this file updated when the call graph or evidence changes.

**Template:** [`docs/templates/phase-1-conformance-issue.md`](../templates/phase-1-conformance-issue.md)

**Call-graph artifact (skeleton — fill during investigation):** [`artifacts/workspace-control-plane-call-graph.md`](artifacts/workspace-control-plane-call-graph.md)

**Central question**

Does the live Workspace path remain **governed end to end** — from resolved intent through policy / control-plane dispatch to adapter execution and disclosure — **without** bypass paths or UI-only masking?

---

## Title

`[Conformance][Phase 1] Governed Workspace control-plane call graph is end-to-end enforced — AIOS-SPEC-007 / AIOS-SPEC-009`

(Long form for docs:) **Phase 1 Conformance — Governed Workspace control-plane call graph is end-to-end enforced**

---

## Metadata

| Field | Value |
|--------|--------|
| **Risky-path row** | Workspace MCP or tools **outside** integration control plane — **SPEC-007** (governed integration), pre-workplace Track C |
| **Risk level** | Critical |
| **Blocks Phase 2?** | **Yes** — if Workspace execution can bypass the control plane or leak disclosure, Phase 2 taxonomy and Workspace conformance cannot be trusted. |
| **Primary owner (role or person)** | Workspace / kernel integration (TBD assignee) |
| **Owner files (first review)** | `src/workspace/integrationControlPlane.ts`, `src/workspace/mcpAdapter.ts`, `src/workspace/mcpIntentToolMap.ts`, `src/workspace/workspacePolicy.ts`, `src/workspace/workspaceAudit.ts`; entry surfaces: `WorkspaceHubSurface.tsx`, `MailMessageActionsPanel.tsx`, `ContactsReadPanel.tsx`, `threadSummarize.ts`, `loadGovernancePayload.ts` |
| **Conformance status** | **Partially conformant** — see **filled** [`artifacts/workspace-control-plane-call-graph.md`](artifacts/workspace-control-plane-call-graph.md) **Conformance status (justified)**; update when runtime/disclosure evidence closes gaps. |

---

## Issue activation gate

This pilot is **not** an active tracked issue until **exact clause anchors** below are accepted (copy into GitHub/tracker). **Mandatory:** `document_id` + **exact** section or numbered list item + **one-line clause intent** — not optional cleanup at close. **“Close enough”** citation normalizes weak conformance; the pilot is the standard.

---

## Failure mode if non-conformant

| Failure | Consequence |
|--------|--------------|
| **Raw adapter execution** outside policy | Tools run without scope/policy/audit; violates governed integration model. |
| **Disclosure missing** while execution still occurs | User/operator cannot see required readiness or risk (**SPEC-009 §12**). |
| **Shell presents policy state it did not receive** | UI becomes a shadow policy engine; trust collapse. |
| **Fallback to generic / unguided behavior** on a governed path | Silent degradation; audit and intent contract bypassed. |
| **noop / silent skip** where execution was expected | Data or actions appear to succeed without governed record. |

---

## Surface / path

**Surfaces:** Workspace hub actions, mail actions, contacts read, governance payload loads that touch Google Workspace, thread summarize paths that call Workspace.

**Intended chain (to verify):**

1. **Entry:** UI or governance loader builds a **`WorkspaceRoutingEnvelope`** (intent + `policy_context`, tenant/user binding, execution mode as applicable).
2. **Boundary:** Only **`runWorkspaceControlPlane`** (`integrationControlPlane.ts`) performs policy checks, audit, intent→tool mapping, and **`callWorkspaceMcpAdapter`**.
3. **Adapter:** **`callWorkspaceMcpAdapter`** (`mcpAdapter.ts`) performs transport (`initialize`, `Mcp-Session-Id`, `tools/call`) — **not** alternate “direct” Workspace JSON-RPC from feature code.
4. **Downstream:** Results return through control-plane result types; disclosure / primary UI consume **policy and audit outcomes**, not inferred shell state.

**Related (non-dispatch):** `GoogleWorkspaceSignInBar.tsx` imports **`getWorkspaceMcpBearerTokenFromEnv`** / **`clearWorkspaceMcpTransportSession`** from `mcpAdapter.ts` for session/token — document whether this remains transport-only and cannot satisfy a governed tool call without passing through **`runWorkspaceControlPlane`**.

---

## Governing clause(s) — exact anchors (required)

Normative files: **`aios-governing-docs/specifications/GoogleWorkspaceIntegrationGovernance.md`**, **`aios-governing-docs/specifications/IntentPrimitiveAndExecutionModel.md`** (versions pinned in registry). **Not** a quote dump — precise anchors only.

| document_id | Section / item | Clause intent (what this issue proves) |
|-------------|----------------|----------------------------------------|
| **AIOS-SPEC-007** | **§2** *Normative routing model* — **item 1** | Client **SHALL** invoke Workspace only via **Intent Router → Integration Control Plane → MCP Adapter**; **MUST NOT** call Google Workspace MCP **tools** directly bypassing **intent** resolution and **scope class** mapping. |
| **AIOS-SPEC-007** | **§2** — **items 2–3** | One intent → one scope class (Phase 1 registry); OAuth/transport per **WORKSPACE.md**; no embedded MCP secrets in client bundles. |
| **AIOS-SPEC-009** | **§2.1** *Shell state vs domain intent* | **Domain** Workspace outcomes **SHALL** be governed intent execution, **not** shell-only routing mistaken for fulfillment. |
| **AIOS-SPEC-009** | **§12** (intro) + **§12.2** *System state (primary-appropriate)* | Policy-backed **execution-readiness** threshold on primary: **lane**, **auth**, **adapter**, **capability** minima when PolicyRecord threshold applies — **not** UI-inferred policy. |
| **AIOS-SPEC-009** | **§12.4** *Operator trace* | **Audit**, **payload**, **transport** exposed on operator surfaces; **MUST NOT** be the default primary surface for typical users. |

Pre-workplace **Track C** is **supporting** only, not a substitute for these clauses.

---

## Current behavior

**Preliminary code scan (repo-local; refresh before closing):**

- **`callWorkspaceMcpAdapter`** is **imported** only in **`integrationControlPlane.ts`** (definition lives in **`mcpAdapter.ts`**; **`workspace/index.ts`** re-exports). No other module imports **`callWorkspaceMcpAdapter`** for feature dispatch — **negative proof target:** maintain this invariant or document a governed exception.
- **`runWorkspaceControlPlane`** is called from: **`WorkspaceHubSurface.tsx`**, **`MailMessageActionsPanel.tsx`**, **`ContactsReadPanel.tsx`**, **`threadSummarize.ts`**, **`loadGovernancePayload.ts`** (multiple envelopes). Each call site must be reviewed for envelope correctness and for **no parallel** ungoverned MCP calls for the same user action.
- **`GoogleWorkspaceSignInBar`** touches **`mcpAdapter`** for token/session — classify as transport-only vs any execution path.

**To fill before “done”:** For each entry point, note actual envelope fields, policy outcome (allow/deny), audit ids, and what the user sees on primary/operator surfaces for that path.

---

## Required behavior

1. Governed Workspace execution **enters** through the **control plane** boundary required by **AIOS-SPEC-007** (policy + routing envelope + audit), not via ad-hoc adapter calls from feature code.
2. **No** production path reaches **`callWorkspaceMcpAdapter`** for governed tools **without** passing **`runWorkspaceControlPlane`** policy and mapping layers (or a documented, clause-backed waiver with council approval).
3. **Trace / disclosure** fields required by **AIOS-SPEC-009 §12** (and **§12.2** where the threshold applies) are **preserved** to user/operator surfaces — not dropped, overwritten by generic copy, or replaced by shell inference.
4. **Bypass, noop, and fallback** either **stay inside** the ratified model (explicit denial, explicit degraded state, audit record) or are **fixed**; no silent generic-chat or raw execution on governed intents.
5. **`resolvedIntentRequiresLocalModel`** (and similar) is **emitted** from **policy / runtime resolution** with provenance; **ShellIdentityBar** (and peer UI) **displays** it only as received — **no UI inference** as policy.

---

## Acceptance criteria

Each item maps to governing clauses above; checkbox in tracker when proved.

- [ ] **Entry boundary:** Every governed Workspace tool execution for Phase-1 intents is initiated with a **valid `WorkspaceRoutingEnvelope`** and processed by **`runWorkspaceControlPlane`** (**AIOS-SPEC-007 §2 item 1**).
- [ ] **No bypass:** No direct dispatch path reaches **`callWorkspaceMcpAdapter`** for governed Workspace tools without governed policy handling (**AIOS-SPEC-007 §2 item 1**).
- [ ] **Disclosure preserved:** Trace/disclosure fields required by **AIOS-SPEC-009 §12 / §12.2 / §12.4** reach user/operator surfaces without loss or UI-only masking.
- [ ] **Fallback model:** Bypass, noop, or fallback does not **silently** degrade into unguided execution; outcomes are **observable** per ratified model (**AIOS-SPEC-007 §2**; **AIOS-SPEC-009** transparency sections).
- [ ] **Policy output:** **`resolvedIntentRequiresLocalModel`** is sourced from **policy/runtime output** with provenance, **not** inferred in shell UI (**AIOS-SPEC-009 §12.2**-aligned policy-backed threshold).

---

## Evidence / tests required

| Type | Requirement |
|------|----------------|
| **Written call graph** | **Primary:** [`artifacts/workspace-control-plane-call-graph.md`](artifacts/workspace-control-plane-call-graph.md) — maintain from issue open; ordered list/diagram: entry → `runWorkspaceControlPlane` → policy/audit → `resolveWorkspaceMcpToolCall` → `callWorkspaceMcpAdapter` → result → disclosure consumers. |
| **File/function references** | Every step anchored to a symbol; PR links optional. |
| **Positive proof** | One or more **automated tests or assertions** showing governed dispatch (e.g. mock adapter called only after envelope validation, or policy deny blocks adapter). |
| **Negative proof** | At least one test or static check that a **bypass is absent** (e.g. lint/grep guard, or test that alternate import of `callWorkspaceMcpAdapter` fails CI, or explicit audit when blocked). |
| **Screenshots** | **Supplemental only** — never primary proof of conformance. |

**Evidence typing (required in artifact §8):** Label each reference as **code**, **test**, **runtime observation**, or **UI observation** — see [`artifacts/workspace-control-plane-call-graph.md`](artifacts/workspace-control-plane-call-graph.md) §8. Prevents mistaking screenshots or surface behavior for proof of ICP/governed dispatch.

---

## Policy vs UI

- **`resolvedIntentRequiresLocalModel`:** Produced in **execution policy / thread summarize / resolution layer** (exact module TBD in implementation); **`ShellIdentityBar`** receives **resolved outcome + provenance** (and reason/readiness if spec requires).
- **Forbidden:** Computing “needs local model” inside the shell from heuristics or copy.

---

## Control-plane / call graph (checklist)

- [ ] **Introduction:** Where governed action / intent IDs are fixed for each Workspace entry path.
- [ ] **Policy:** Where **`canExecuteScopeClass`** / scope validation / surface mode are enforced (`integrationControlPlane` and dependencies).
- [ ] **Bypass:** Any path that skips **`runWorkspaceControlPlane`** or calls **`mcpAdapter`** for execution without policy — **must be zero** or waived.
- [ ] **Trace / disclosure:** Where audit logs and UI disclosure attach; where fields could be dropped (document “none” or fix).
- [ ] **Dispatch model:** Confirm **governed execution** (envelope + policy + audit) vs **raw tool dispatch** end-to-end.

**Artifact:** Update [`artifacts/workspace-control-plane-call-graph.md`](artifacts/workspace-control-plane-call-graph.md) continuously; **done** when sections 1–8 are filled and evidence rows link to tests/PRs.

---

## Durable outputs (success criteria)

When this pilot is **closed**, these three deliverables exist:

1. **Tracker issue** with **exact clause bindings** (table above) and **Conformance status** = Conformant with evidence — or **Non-conformant** with explicit remediation issues.
2. **Call-graph artifact** showing where governance is enforced or can leak: [`artifacts/workspace-control-plane-call-graph.md`](artifacts/workspace-control-plane-call-graph.md).
3. **Proof material:** tests/assertions/negative checks per **Evidence / tests required**.

---

## Out of scope / dependencies

- **AMD-2026-009** web retrieval / external knowledge (Phase 3) unless same transport is mistakenly reused — only note cross-leaks.
- **google-workspace-mcp** server behavior: cite separate server-side conformance if needed; this pilot is **client path**.

---

## Done definition

**Done** when **Acceptance criteria** are checked with **Evidence** satisfied, **Conformance status** updated, **clause anchors** match current **`aios-governing-docs`** text, and **Durable outputs** (3) are present. This pilot doc is a **pattern**, not law; **ratified specs** remain authoritative.
