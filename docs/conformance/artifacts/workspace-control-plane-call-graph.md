# Workspace control-plane call graph — conformance artifact

**Pilot issue:** [`pilot-issue-workspace-control-plane-call-graph.md`](../pilot-issue-workspace-control-plane-call-graph.md)  
**Status:** Filled — code + test + **runtime/UI pass (2026-04-07)**. **#14 auth/readiness:** **implemented (2026-04-06)** — `resolveWorkspaceState` + `hasWorkspaceMcpExecutionToken`; **live verification** (shell + Mail/Calendar/Drive with no bearer) **pending** before closing **https://github.com/gateway-global-ai/ai-os-voice-interface/issues/14**.  
**Repo / branch:** `ai-os-voice-interface` — execute on branch `conformance/pilot-workspace-call-graph` (or equivalent).  
**Tracked issue:** https://github.com/gateway-global-ai/ai-os-voice-interface/issues/12

**Canonical sources (normative text):** `aios-governing-docs/specifications/GoogleWorkspaceIntegrationGovernance.md` (**AIOS-SPEC-007**), `aios-governing-docs/specifications/IntentPrimitiveAndExecutionModel.md` (**AIOS-SPEC-009**).

---

## Conformance status (justified)

**Partially conformant** (overall). **Lane split (runtime evidence, 2026-04-07+):** **Drive** and **Calendar** — governed panels load real data (file list; calendars + bounded events). **Mail** — **not** stable enough to call conformant: observed **two** modes — (a) **connected** + bounded unread scope but **formatted-list** failure (**#13**); (b) **historical:** panel **Google sign-in required** / no GIS token while **shell** still showed **Google Workspace connected** (**#14** — auth-state parity). **#14 code (2026-04-06)** unifies shell + payload on **`WorkspaceState`** from **`hasWorkspaceMcpExecutionToken()`** (`auth_required` vs executable **`connected`**); **re-verify** under “no bearer” that mixed messaging is gone (**#14** live pass). **Disclosure:** pre-#14, shell “connected” vs panel token reality could **contradict** → **AIOS-SPEC-009** §12 gap; post-#14 intended path removes that split for **readiness** (remaining Mail issues may be **#13** / CP result shape, not header vs token).

**Why (evidence only):**

- **Positive (code + test):** The substring **`callWorkspaceMcpAdapter`** appears only under **`src/workspace/`** in **`mcpAdapter.ts`** (definition), **`integrationControlPlane.ts`** (sole execution callsite), **`index.ts`** (barrel re-export), and the **callsite guard test**. No feature module imports **`callWorkspaceMcpAdapter`** for dispatch. Automated guard: **`src/workspace/callWorkspaceMcpAdapterCallsite.test.ts`**. This answers the binary control-plane question for **static structure**: **no** parallel adapter path in `src/` today.
- **Positive (code):** All **`runWorkspaceControlPlane`** entrypoints listed in §1 import **`integrationControlPlane`** directly (not a bypass). **`GoogleWorkspaceSignInBar`** imports **`mcpAdapter`** only for **`clearWorkspaceMcpTransportSession`** and **`getWorkspaceMcpBearerTokenFromEnv`** (transport/session), not **`callWorkspaceMcpAdapter`**.
- **Runtime:** **Drive / Calendar** succeed at listing bounded results in-session. **Mail** instability is primarily **#13** (formatter/contract); **#14** readiness split (header vs execution token) is **mitigated in code** pending live confirmation. **Chat:** assistant text can promise “pull up email/calendar” without a dependable **intent → governed panel** handoff on the home/chat surface — separate UX/intent-routing work (not blocking ICP static proof).
- **Governed intent resolution (Calendar):** Multiple calendars visible in UI; voice/chat “calendar for today” without **which calendar** is **under-specified** — **#15** (disambiguation vs silent default).

**Key sentence:** Runtime evidence shows successful governed execution in **Drive** and **Calendar**, but **Mail** remains unstable across **formatted-list failure while connected** (**#13**) and historically **panel-level sign-in-required** vs **shell-level “connected”** (**#14**, **mitigated in code** pending live confirmation). **Auth-state parity** for disclosure is addressed by **`resolveWorkspaceState`** + **`auth_required`**; **mail-path** rendering remains **#13**.

- **Still open:** Audit/correlation IDs **not** fully captured; **§12.2 / §12.4** parity; **`resolvedIntentRequiresLocalModel`** policy-sourced.

**Binary question:** *Is the Workspace path governed end to end, or only described that way?* — **ICP structure + Drive/Calendar runtime support “yes” for those lanes; Mail + disclosure need the tracked follow-ups (#13–#15).**

---

## Clauses under test (exact anchors)

| document_id | Section / item | Clause intent |
|-------------|----------------|---------------|
| **AIOS-SPEC-007** | **§2** *Normative routing model* — **item 1** | Client **SHALL** use **Intent Router → ICP → MCP Adapter**; **MUST NOT** call MCP **tools** directly bypassing intent and scope class. |
| **AIOS-SPEC-007** | **§2** — **items 2–3** | Phase-1 intent mapping; OAuth/transport per **WORKSPACE.md**; no secrets in bundle. |
| **AIOS-SPEC-009** | **§2.1** | Domain Workspace fulfillment vs shell-only routing. |
| **AIOS-SPEC-009** | **§12** + **§12.2** + **§12.4** | Primary readiness; operator trace. |

---

## 1. Entrypoints

| # | Surface / trigger | File(s) | Envelope builder | Notes |
|---|-------------------|---------|------------------|-------|
| 1 | Workspace payload load (mail, read, drive, contacts, search, …) | `src/shellCanvas/loadWorkspacePayload.ts` | Builds `WorkspaceRoutingEnvelope` per flow; `await runWorkspaceControlPlane` at ~669, 734, 784, 841, 892, 944 | **Code** |
| 2 | Mail message actions | `src/overlays/MailMessageActionsPanel.tsx` | `runWorkspaceControlPlane` ~160, ~236 | **Code** |
| 3 | Workspace hub (calendar/mail/drive UI) | `src/overlays/WorkspaceHubSurface.tsx` | `runWorkspaceControlPlane` ~897, ~934 | **Code** |
| 4 | Contacts read panel | `src/components/workspace/ContactsReadPanel.tsx` | `runWorkspaceControlPlane` ~41 | **Code** |
| 5 | Thread summarize (governed) | `src/workspace/threadSummarize.ts` | `runWorkspaceControlPlane` ~115 | **Code** |

No other `src/**/*.ts(x)` files invoke **`runWorkspaceControlPlane`** (see grep inventory).

---

## 2. Policy decision boundary

| Check | Location (file / function) | Clause binding |
|-------|----------------------------|------------------|
| Intent ↔ scope class; Phase-1 allowlist; `policy_context` match | `integrationControlPlane.ts` — `validateEnvelope` (lines 31–43) | **AIOS-SPEC-007** §2 |
| Surface-mode policy (`canExecuteScopeClass`) | `integrationControlPlane.ts` ~69–79 | **AIOS-SPEC-007** §2 |
| Execution scope / envelope validation (when present) | `integrationControlPlane.ts` ~114–163 (`validateScopeOperation`, `routingEnvelopeToScopeTarget`) | **AIOS-SPEC-007** §2; **AIOS-SPEC-010** bridge when `execution_scope` set |
| Audit on allow/deny | `logWorkspaceAudit` / `logScopeAllow` / `logScopeViolation` | **AIOS-SPEC-009** §12.4-style trace hooks |

---

## 3. Governed dispatch boundary

| Step | Location | Proven |
|------|----------|--------|
| Single ICP entry | `runWorkspaceControlPlane` in `integrationControlPlane.ts` | **Y** — **code** |
| Intent → MCP tool name + args | `resolveWorkspaceMcpToolCall` in `mcpIntentToolMap.ts` (invoked from ICP ~93) | **Y** — **code** |
| No alternate `tools/call` path in feature code | Entire `src/` scan for `callWorkspaceMcpAdapter` | **Y** — **code** + **test** |

---

## 4. Adapter invocation

| Function | Called from | Transport-only? | Evidence |
|----------|-------------|-----------------|----------|
| **`callWorkspaceMcpAdapter`** | **`integrationControlPlane.ts`** ~187 only (in `src/`) | **No** — execution | **Code** |
| **`getWorkspaceMcpBearerTokenFromEnv`**, **`clearWorkspaceMcpTransportSession`** | **`GoogleWorkspaceSignInBar.tsx`** (and token path in ICP ~165) | **Yes** (session/clear; no `tools/call`) | **Code** |
| Barrel **`export { callWorkspaceMcpAdapter }`** | `workspace/index.ts` | Re-export only; **no** consumer imports it for dispatch in `src/` | **Code** (grep) |

---

## 5. Disclosure / trace propagation

| Field / obligation | Produced at | Consumed at | Preserved (this pass) |
|--------------------|-------------|-------------|-------------------------|
| **§12.2** (lane, auth, adapter, capability) | `spec009PrimaryDisclosure.ts` + `WorkspaceState` / `LocalModelReadiness` | `ShellIdentityBar.tsx` via `buildPrimarySecondaryDisclosureLine` | **Partial** — **code** shows wiring exists; **not** proven for every CP result path or every branch (**runtime** TBD). |
| **`resolvedIntentRequiresLocalModel`** | Intended: policy/runtime | `ShellIdentityBar` prop (default `false` in `App.tsx` path) | **Gap** — not yet policy-sourced; **AIOS-SPEC-009 §12.2** follow-up. |
| **§12.4** audit / operator | `logWorkspaceAudit`, scope audits | Operator/diagnostics surfaces | **Partial** — audit calls in ICP; **full** operator UX parity **not** runtime-verified here. |
| **Mail lane “Messages in scope”** | `WorkspaceHubSurface` / mail search rows path | User-visible error string when format fails | **Gap** — generic message may **not** expose adapter/tool root cause (**AIOS-SPEC-009** transparency follow-up if operator cannot see real failure). |

---

## 6. Fallback / noop branches

| Branch | Trigger | Outcome | Audit / user-visible |
|--------|---------|---------|----------------------|
| Invalid envelope | `validateEnvelope` fails | `ok: false`, `invalid_intent` | `logWorkspaceAudit` deny, `failure_mode: invalid_envelope` |
| Policy deny | `!canExecuteScopeClass(...).allowed` | `policy_denied` | `logWorkspaceAudit` deny |
| Tool mapping / email missing | `resolveWorkspaceMcpToolCall` fails | `invalid_intent` / `not_configured` | `logWorkspaceAudit` |
| Scope / execution_scope deny | `validateScopeOperation` | `scope_denied` | `logScopeViolation` |
| No bearer token | No GIS token and no env bearer | `auth_required` | `logWorkspaceAudit` `failure_mode: auth_required` — **adapter not called** |
| Adapter error | `callWorkspaceMcpAdapter` returns `ok: false` | `adapter_error` / `not_configured` | `logWorkspaceAudit` |

**Code:** `integrationControlPlane.ts` lines 56–211.

---

## 7. Blocked bypass candidates

| Candidate bypass | Verified absent / blocked | Evidence type |
|------------------|---------------------------|----------------|
| Direct **`callWorkspaceMcpAdapter`** use outside allowlist | **Absent** in `src/` except definition, ICP, barrel, test | **Code** (repo scan) + **Test** (`callWorkspaceMcpAdapterCallsite.test.ts`) |
| Feature code importing **`mcpAdapter`** for `tools/call` | Only **`GoogleWorkspaceSignInBar`** + **`integrationControlPlane`**; Sign-in bar uses transport helpers only | **Code** |
| Dynamic import / string `tools/call` | No other `tools/call` in `src/` outside **`mcpAdapter.ts`** | **Code** (grep) |

---

## 8. Evidence references

### Code

| Reference | Clause / claim |
|-----------|----------------|
| `src/workspace/integrationControlPlane.ts` — `runWorkspaceControlPlane`, `validateEnvelope`, `callWorkspaceMcpAdapter` | **AIOS-SPEC-007** §2 — ICP boundary |
| `src/workspace/mcpAdapter.ts` — `callWorkspaceMcpAdapter` | Single transport implementation for `tools/call` |
| `src/components/workspace/GoogleWorkspaceSignInBar.tsx` — imports from `mcpAdapter` | Transport-only; no `callWorkspaceMcpAdapter` |
| `src/shellCanvas/loadWorkspacePayload.ts`, `WorkspaceHubSurface.tsx`, `MailMessageActionsPanel.tsx`, `ContactsReadPanel.tsx`, `threadSummarize.ts` | All entry through `runWorkspaceControlPlane` |
| `src/compliance/spec009PrimaryDisclosure.ts`, `src/components/shell/ShellIdentityBar.tsx` | Disclosure wiring (partial vs §12.2) |
| `src/shell/workspaceState.ts` — `resolveWorkspaceState`, `hasWorkspaceMcpExecutionToken`, `shouldShowWorkspaceHub` | **#14:** executable **`connected`** vs **`auth_required`**; shell + `loadGovernancePayload` share model |

### Test

| Reference | Clause / claim |
|-----------|----------------|
| `src/workspace/callWorkspaceMcpAdapterCallsite.test.ts` | **Negative proof:** bypass of `callWorkspaceMcpAdapter` blocked or absent |
| `src/shell/workspaceState.test.ts` | **#14:** hub gate (`shouldShowWorkspaceHub`) |
| `src/compliance/spec009PrimaryDisclosure.test.ts` | **#14:** `auth_required` forces disclosure |

### Runtime observation

| Reference | Clause / claim |
|-----------|----------------|
| **2026-04-07** local dev app | **Workspace auth:** UI banner *Connected · Google token ready for Workspace* (MCP OAuth path). **Not** a sign-in failure. |
| Same session | **Drive lane:** File list loaded (governed panel). |
| Same session | **Calendar lane:** Calendars listed; **events** loaded for **bounded window**. **AIOS-SPEC-007** §2 runtime for Calendar. |
| Same session | **Mail (mode A):** Bounded unread scope + **formatted-list** generic error while panel showed connected — **#13**. |
| Later / variant | **Mail (mode B, pre-#14):** Panel **Google sign-in required** / no GIS token for MCP, while **shell** still **Google Workspace connected** — **#14**. **Post-#14 expectation:** shell **`auth_required`** when no execution bearer — **re-verify**. |
| Chat surface | User asks for email/calendar “today”; reply promises pull-up; **panel handoff** not always visible on chat home — routing/product follow-up. |
| Audit IDs | **Not captured** in this session (devtools/console) — still TBD for §12.4 trace. |

### UI observation (supplemental only)

| Reference | Clause / claim | Paired non-UI proof |
|-----------|----------------|---------------------|
| Calendar modal **WORKSPACE - GOVERNED** + SPEC-007 | Bounded calendar/events success | **Runtime** row above + **code** ICP |
| **Drive** modal — file list | **Runtime** proof for Drive lane | **Runtime** + ICP |
| Mail modal bounded unread + **failure string** | **#13** — formatter path | Payload → `normalizeMailSearchRows` |
| Mail **sign-in required** vs header **Workspace connected** | **#14** (historical); **post-#14:** unified **`WorkspaceState`** | `workspaceState.ts` + live pass |
| Multiple calendars visible; chat “calendar for today” | **#15** — disambiguation vs silent default | **AIOS-SPEC-009** intent resolution |
| System Options → Workspace **(governed gate)** | Entry labeling | **Code** + product copy |
| Voice/chat shell **READY** / speaking states | Shell only — not CP proof | N/A |

**Screenshots:** Captured 2026-04-07 (pilot); stored with user workspace assets — use for review, not as sole proof of policy.

### Meta

| Static checks / CI | PRs |
|--------------------|-----|
| `npm test` includes callsite guard | *(this change)* |

---

## 9. Follow-ups (from evidence)

| Item | Tracking |
|------|----------|
| **Mail:** bounded unread list not rendered while governed + connected | **https://github.com/gateway-global-ai/ai-os-voice-interface/issues/13** — debug MCP payload → **`normalizeMailSearchRows`** / **`WorkspaceHubSurface`** mail path — **chain:** [`issue-13-mail-path-debug.md`](issue-13-mail-path-debug.md) |
| **Auth:** shell “Workspace connected” vs Mail panel “sign-in required” | **https://github.com/gateway-global-ai/ai-os-voice-interface/issues/14** — **code done** (see [`ISSUE_BODY-workspace-auth-parity.md`](../ISSUE_BODY-workspace-auth-parity.md) **Implementation record**); **close after live repro** |
| **Calendar:** disambiguation when multiple calendars + under-specified “today” intent | **https://github.com/gateway-global-ai/ai-os-voice-interface/issues/15** |
| **Session identity / fallback:** governance persona + hub launcher win over edited intent; chat/voice ignore operator profile | **New issue** — draft: [`ISSUE_BODY-session-identity-fallback-routing.md`](../ISSUE_BODY-session-identity-fallback-routing.md) (**blocks** trustworthy Workspace UX until resolved) |
| **Policy-sourced `resolvedIntentRequiresLocalModel`** | Separate remediation per pilot |
| **Audit IDs in runtime session** | Optional next capture for §12.4 |

---

## 10. Recommended implementation order (engineering)

**Rationale:** **Session identity / fallback** (new issue — [`ISSUE_BODY-session-identity-fallback-routing.md`](../ISSUE_BODY-session-identity-fallback-routing.md)) is a **cross-cutting blocker**: if runtime `systemInstruction` and routing **default to governance**, Workspace lanes feel “haunted” regardless of **#14–#15**. **#14** first among **Workspace-only** fixes — if shell and panel disagree on auth, **#13** Mail debugging is noisy. **#15** = CP / intent resolution; **#13** = mail payload/formatter. **Chat handoff** and **launcher UX** after identity + CP truth are aligned.

| Order | Issue | Focus |
|-------|--------|--------|
| **0** | **Session identity / fallback** (new) | **Authoritative** session profile → voice/chat `systemInstruction`; no silent **governance** default on ambiguous Workspace asks; clarify **agentIntent** vs **userIntent** (`App.tsx`) |
| 1 | **#14** | One authoritative runtime **auth** state for shell + panels + ICP bearer path — **live verify** |
| 2 | **#15** | **Disambiguation** in CP / resolution layer; UI renders options + user choice |
| 3 | **#13** | **`mailResult.data`** vs **`normalizeMailSearchRows`**; contract / formatter / transparency |
| 4 | (follow) | **Chat → governed surface** handoff; reduce **dashboard launcher** feel once persona authority is fixed |

**Target (aspirational):** Workspace intents resolve to a **single structured outcome family** so every surface reads the same truth — e.g. `ready_to_execute`, `auth_required`, `needs_disambiguation` (+ options), `policy_denied`, `executed_with_result`, `executed_with_unrenderable_result`. **Normative text** remains **AIOS-SPEC-007** / **AIOS-SPEC-009**; this table is **delivery sequencing**, not law.

**#14 implementation target (engineering, non-normative):** One **authoritative** auth/readiness signal from **CP or shared runtime**; **shell + panels** consume it; **no** contradictory local “connected” heuristics vs execution-time GIS/bearer; states like **`auth_ready` / `auth_required` / `token_stale`** only from that source. Unblocks **#15** on the same response model. Details: [`ISSUE_BODY-workspace-auth-parity.md`](../ISSUE_BODY-workspace-auth-parity.md) **Implementation target**.

**#14 implementation status (2026-04-06):** Delivered in **`src/shell/workspaceState.ts`** — **`hasWorkspaceMcpExecutionToken()`** + **`resolveWorkspaceState()`** (`auth_required` ⟺ preference + MCP URL but no GIS/env bearer; **`connected`** ⟺ executable). **`loadGovernancePayload`**, **`App.tsx`**, **`spec009PrimaryDisclosure`**, shell labels, **`WorkspaceHubSurface`** gate aligned. **Tests:** `workspaceState.test.ts`, `spec009PrimaryDisclosure.test.ts` (see §8 **Test** table). **Next:** one **live** run (no bearer, opted in) across **shell + Mail + Calendar + Drive** — expect consistent **`auth_required`** messaging; then close **#14** and proceed **#15** (calendar disambiguation on CP outcome model).

---

## Revision log

| Date | Author | Change |
|------|--------|--------|
| 2026-04-06 | | Skeleton created |
| 2026-04-06 | | Evidence types (code / test / runtime / UI) + discipline |
| 2026-04-06 | | First filled pass: entrypoints, boundaries, bypass proof, **Partially conformant** |
| 2026-04-06 | | GitHub issue **#12** opened |
| 2026-04-07 | | Runtime/UI: auth OK; **Calendar** success; **Mail** formatted-list failure; status **Partially conformant** (lane split) |
| 2026-04-07 | | **#12** comment + follow-up **#13** (Mail rendering) |
| 2026-04-07 | | **#13** debug chain doc [`issue-13-mail-path-debug.md`](issue-13-mail-path-debug.md) |
| 2026-04-07 | | Drive + Mail mode B + chat handoff + **#14** / **#15** (auth parity + calendar disambiguation) |
| 2026-04-07 | | §10 implementation order (**#14** → **#15** → **#13** → chat) + target CP outcome family |
| 2026-04-07 | | **#14** implementation target + \`ISSUE_BODY-workspace-auth-parity.md\` |
| 2026-04-06 | | **#14** code landed (\`workspaceState.ts\`, shared payload + shell); tests; artifact + ISSUE_BODY **Implementation record**; live verification pending before close |
| 2026-04-07 | | **Session identity / fallback** draft [`ISSUE_BODY-session-identity-fallback-routing.md`](../ISSUE_BODY-session-identity-fallback-routing.md); §9 + §10 priority order updated (blocker **before** #15 / #13) |
