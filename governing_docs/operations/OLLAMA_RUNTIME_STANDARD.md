---
document_id: OLLAMA_RUNTIME_STANDARD
registry_id: AIOS-OPS-001
version: 0.1.0
status: draft
category: operations
title: Ollama Local Model Runtime Standard
author: Gateway Global AIOS
created: 2026-04-03
last_updated: 2026-04-04
reviewers: []
cross_references:
  - AIOS-SPEC-009
  - AIOS-SPEC-007
  - AMD-2026-007
---

# Ollama Local Model Runtime Standard

## 1. Purpose

**Ollama** is the **approved local inference runtime** for **sovereign interpretation** tasks in the AI OS — summarization, classification, extraction, and proposed reply bullets over **retrieved** Workspace content (mail, calendar context), as defined in **AIOS-SPEC-009 §16**.

This document answers, for operators and implementers:

1. **When is local Ollama required?**
2. **Where must it be installed and running?**
3. **What capabilities may use it?**
4. **When may the system fall back to Gemini or another remote model?**

Without these answers, “use the local LLM” remains **aspirational** and implementations will diverge.

---

## 2. When is local Ollama required?

| Context | Requirement |
|---------|----------------|
| **Product claims “local-first” or “sovereign” interpretation** for Workspace mail/calendar | **Ollama (or a future approved local runtime)** **SHALL** be the **default** interpretation path when the environment is **declared** for local inference. |
| **Development / founder workstation** | **SHOULD** run Ollama for parity with production interpretation behavior. |
| **Central server** hosting the AI OS **with** interpretation features | **SHALL** run Ollama (or equivalent) in the **same trust zone** as the app or a **documented** private endpoint — **not** silently omitted. |

Ollama is **not** required for:

- **MCP retrieval only** (search, read message, thread content, draft via Gmail tools) — those use **Google Workspace MCP** per **AIOS-SPEC-007**.
- **Voice / live** layers that use **Gemini** by product design — **provided** Workspace mail interpretation **still** follows **AIOS-SPEC-009 §16** for default content interpretation.

---

## 3. Where must it be installed and running?

| Environment | Installation |
|-------------|----------------|
| **Local dev** | Ollama **application** or **CLI** on the developer machine; default API **`http://127.0.0.1:11434`** unless overridden. |
| **Founder / operator workstation** | Same; **SHOULD** match documented **model** names (e.g. `llama3.x`) for reproducibility. |
| **Server runtime** | Ollama as a **service** (systemd, container, or orchestrated workload) on **private** network; **MUST NOT** expose unauthenticated inference to the public internet without **separate** security review. |

**Network**

- Browser-based UIs **MUST NOT** assume Ollama is callable from the **browser** unless **CORS** and **auth** are explicitly configured (preferred: **backend** or **same-origin proxy** calls Ollama).
- Default stance: **app server or desktop helper** calls **`127.0.0.1:11434`**, not arbitrary client origins.

**Configuration (informative)**

- Base URL: e.g. **`OLLAMA_HOST`**, **`VITE_OLLAMA_BASE_URL`** (dev proxy), or server env — **document** in app **`.env.example`** when wired.

---

## 4. What capabilities are allowed to use it?

Interpretation capabilities **SHOULD** be registered per **AIOS-SPEC-009 §16.3**. Initial **approved** uses of local Ollama:

| Capability id | Domain | Plane | Notes |
|-----------------|--------|-------|--------|
| `local.llm.summarize` | `workspace.mail`, `workspace.calendar` | `read` | Thread or event context **after** MCP retrieval. |
| `local.llm.classify` | `workspace.mail` | `read` | Urgency, intent, bucket — **no** auto-send. |
| `local.llm.extract_actions` | `workspace.mail` | `read` | Action items as **structured** output for review. |
| `local.llm.propose_reply` | `workspace.mail` | `read` | **Bullets** or draft **text** for user review; **Gmail draft** still via **`draft_gmail_message`** + **§15**. |

**MUST NOT** (by default):

- Use local LLM for **irreversible sends** without **§15** execution gating.
- Replace **policy** or **execution plan** evaluation — those remain **deterministic** governance layers.
- Mark a capability **enabled** without **readiness** (**§5**).

---

## 5. Readiness states (normative)

| State | Meaning |
|-------|--------|
| `not_installed` | Ollama binary not found / not in path for the configured check. |
| `installed_not_running` | Binary exists; HTTP API **not** reachable. |
| `running_no_models` | API up; **required model** not pulled. |
| `running_ready` | API up; required model present; optional **smoke inference** passed. |
| `degraded` | Partial (e.g. slow, failing health); **disclose**; **do not** claim full availability. |

A capability **SHALL** be treated as **unavailable** for **local** inference unless state is **`running_ready`** (or policy defines **degraded** allowances).

---

## 6. Readiness checks (SHALL)

Before offering **local** interpretation:

1. **Binary / service**: configured **base URL** reachable (TCP + HTTP health).
2. **Model**: required model name **listed** via Ollama API (`/api/tags` or equivalent).
3. **Inference smoke** (optional but **RECOMMENDED**): minimal prompt/response to detect runtime errors.

**POL-MODEL-002**: Missing or failed checks **MUST** be **disclosed** in UI or operator surface — **not** silent.

---

## 7. Fallback: when may Gemini or remote models run?

Aligned with **AIOS-SPEC-009 §16.4** and **POL-MODEL-003**:

| Condition | Behavior |
|-----------|----------|
| Local **not** `running_ready` | **Block** local interpretation **or** **proposal** for cloud — **never** silent substitute. |
| User **explicitly** opts in to cloud | Remote allowed; **audit** / disclose “remote inference”. |
| **Policy** allows remote for task/environment | Remote allowed; **auditable**. |
| **Escalation** path (context too large, quality threshold) | **Offer** user/operator choice; then remote if accepted. |

**POL-MODEL-003**: Every **remote** inference for a **local-first** task **SHALL** leave an **audit** trail (intent id, policy decision, disclosure flag).

---

## 8. Disclosure (UI / operator)

Surfaces **SHOULD** show, when interpretation is in scope:

- **Local model**: `Ready` | `Unavailable` | `Degraded` (map from **§5**).
- **Runtime**: `Ollama` (or future approved name).
- **Model**: e.g. `llama3.2` (configured tag).
- **Fallback**: `Disabled` | `Enabled by policy` | `User opted in` | `Blocked`.

This aligns with **AIOS-SPEC-009** transparency and **POL-WS-UI** operator vs primary surfaces.

---

## 9. Security and data handling

- **Mail/calendar text** in prompts **SHALL** stay in the **trust zone** of the Ollama deployment (local disk / private network).
- **Logs** of prompts/responses **SHOULD** be **redacted** or **disabled** in production unless **compliance** requires retention.
- **Remote** fallback **SHALL** follow **data classification** rules for the tenant.

---

## 10. Relationship to other documents

| Document | Role |
|----------|------|
| **AIOS-SPEC-009** §16 | Normative model lane and **POL-MODEL-001**–**004**. |
| **AIOS-SPEC-007** / **WORKSPACE.md** | Workspace capability registry and MCP vs interpretation split. |
| **AMD-2026-007** | Amendments and policy registration. |

---

## 11. Revision history

| Version | Date | Summary |
|---------|------|---------|
| 0.1.0 | 2026-04-03 | Initial draft: readiness states, fallback, disclosure, capability table. |

---

**End of OLLAMA_RUNTIME_STANDARD**
