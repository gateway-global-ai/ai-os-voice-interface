---
document_id: WHISPER_RUNTIME_STANDARD
registry_id: AIOS-OPS-002
version: 0.1.0
status: draft
category: operations
title: Whisper / faster-whisper Local STT Runtime Standard
author: Gateway Global AIOS
created: 2026-04-04
last_updated: 2026-04-04
reviewers: []
cross_references:
  - AIOS-SPEC-009
  - AIOS-SPEC-009 §17
  - AMD-2026-008
---

# Whisper / faster-whisper Local STT Runtime Standard

## 1. Purpose

**Whisper** (OpenAI ASR weights) and **faster-whisper** (CTranslate2 inference) are the **initial approved** runtimes for the **sovereign speech-input lane** — converting **user audio** to **text** for intent routing, transcription display, and downstream local interpretation (**AIOS-SPEC-009 §17.3**).

This document answers, for operators and implementers:

1. **When is local STT required?**
2. **Where must it run?**
3. **What capabilities may use it?**
4. **When may the system fall back to remote STT?**

Aligned structurally with **[OLLAMA_RUNTIME_STANDARD.md](./OLLAMA_RUNTIME_STANDARD.md)** and **[LOCAL_TTS_RUNTIME_STANDARD.md](./LOCAL_TTS_RUNTIME_STANDARD.md)**.

---

## 2. When is local Whisper / faster-whisper required?

| Context | Requirement |
|---------|-------------|
| **Product claims sovereign, local-first, or air-gapped speech input** | **Local STT** **SHALL** be the **default** path when the environment is **declared** for local voice. |
| **Development / founder workstation** | **SHOULD** run local STT for parity with production sovereign voice. |
| **Server runtime** with sovereign voice | **SHALL** run STT in the **same trust zone** as the app — **not** silently omitted. |

Local STT is **not** required for:

- Products that **only** use vendor cloud STT **and** do not claim **§17** sovereign voice.
- **Text-only** interaction modes.

---

## 3. Where must it be installed and running?

| Environment | Installation |
|-------------|----------------|
| **Local dev** | **faster-whisper** Python package, **whisper.cpp**, or **OpenAI Whisper** CLI; or a **sidecar** HTTP/gRPC service exposing a **documented** transcribe API. |
| **Server** | Container or system service on **private** network; **MUST NOT** expose unauthenticated STT to the public internet without **separate** security review. |

**Network**

- **Browser** capture **SHOULD** send audio to a **same-origin** or **trusted** backend that runs STT — **not** assume raw mic audio goes to arbitrary third parties for sovereign modes.

**Configuration (informative)**

- Model size / device (CPU/GPU), language defaults — **document** in **`.env.example`** when wired (e.g. `WHISPER_MODEL`, `LOCAL_STT_ENDPOINT`).

---

## 4. Approved capabilities

| Capability id | Plane | Lane | Notes |
|----------------|-------|------|--------|
| `local.stt.transcribe` | `read` (input) | `local` | **STT only** — does **not** interpret Workspace mail content; that is **`local.llm.*`** + **§16**. |

**MUST NOT** (by default):

- Send **raw audio** to **remote** STT for sovereign modes without **§17.4** disclosure and policy.
- Mark **enabled** without **readiness** (**§5**).

---

## 5. Readiness states (normative)

| State | Meaning |
|-------|--------|
| `not_installed` | No STT binary / Python env / service found for the configured check. |
| `installed_not_running` | Expected endpoint or process **not** reachable. |
| `running_no_models` | Runtime up; **required model** weights **not** present. |
| `running_ready` | Runtime up; model loaded; optional **smoke** transcribe passed. |
| `degraded` | Partial failure; **disclose**; **do not** claim full availability. |

A capability **SHALL** be treated as **unavailable** for **local** STT unless state is **`running_ready`** (or policy defines **degraded** allowances).

---

## 6. Readiness checks (SHALL)

Before offering **local** transcription for sovereign modes:

1. **Process / endpoint**: configured **base URL** or IPC **reachable**.
2. **Model**: required weights **present** (where applicable).
3. **Smoke** (optional but **RECOMMENDED**): minimal audio sample or health probe.

**Disclosure**: Missing checks **MUST** be **disclosed** in UI or operator surface — **not** silent.

---

## 7. Fallback: remote STT

Aligned with **AIOS-SPEC-009 §17.4** and **POL-LANE-VOICE-003**:

| Condition | Behavior |
|-----------|----------|
| Local **not** `running_ready` | **Block** local STT **or** **proposal** for cloud — **never** silent substitute. |
| User **explicitly** opts in to cloud STT | Remote allowed; **audit** / disclose. |
| **Policy** allows remote for task/environment | Remote allowed; **auditable**. |

---

## 8. Disclosure (UI / operator)

Surfaces **SHOULD** show, when sovereign speech-input is in scope:

- **Local STT**: `Ready` | `Unavailable` | `Degraded` (map from **§5**).
- **Runtime**: e.g. `faster-whisper` / `whisper.cpp`.
- **Model**: e.g. `base` / `small` (configured).
- **Fallback**: `Disabled` | `Proposal` | `Allowed` (policy).

---

## 9. Security and data handling

- **Audio** for sovereign modes **SHALL** stay in the **trust zone** of the STT deployment (local disk / private network).
- **Logs** **SHOULD** avoid retaining raw audio unless **compliance** requires.
- **Remote** fallback **SHALL** follow **data classification** rules.

---

## 10. Relationship to other documents

| Document | Role |
|----------|------|
| **AIOS-SPEC-009 §17** | Normative sovereign voice lanes. |
| **OLLAMA_RUNTIME_STANDARD** | Interpretation lane (separate from STT). |
| **LOCAL_TTS_RUNTIME_STANDARD** | Speech-output lane. |
| **WORKSPACE.md** | Capability registry rows for `local.stt.transcribe`. |

---

## 11. Revision history

| Version | Date | Summary |
|---------|------|---------|
| 0.1.0 | 2026-04-04 | Initial draft: parity with Ollama standard structure. |

---

**End of WHISPER_RUNTIME_STANDARD**
