---
document_id: LOCAL_TTS_RUNTIME_STANDARD
registry_id: AIOS-OPS-003
version: 0.1.0
status: draft
category: operations
title: Local Text-to-Speech (TTS) Runtime Standard
author: Gateway Global AIOS
created: 2026-04-04
last_updated: 2026-04-04
reviewers: []
cross_references:
  - AIOS-SPEC-009
  - AIOS-SPEC-009 §17
  - AMD-2026-008
---

# Local Text-to-Speech (TTS) Runtime Standard

## 1. Purpose

**Local TTS** is the **approved speech-output lane** for products that claim **sovereign** or **local-first** voice — synthesizing **assistant text** to **audio** for playback (**AIOS-SPEC-009 §17.5**).

Specific **engine** implementations (e.g. Piper, Coqui, platform ONNX, espeak-ng) are **not** fixed in this document; **each** production deployment **MUST** name its engine in **configuration** and **operator** documentation. This standard defines **obligations** (readiness, fallback, disclosure) **parallel** to **[OLLAMA_RUNTIME_STANDARD.md](./OLLAMA_RUNTIME_STANDARD.md)** and **[WHISPER_RUNTIME_STANDARD.md](./WHISPER_RUNTIME_STANDARD.md)**.

This document answers:

1. **When is local TTS required?**
2. **Where must it run?**
3. **What capabilities may use it?**
4. **When may the system fall back to remote TTS?**

---

## 2. When is local TTS required?

| Context | Requirement |
|---------|-------------|
| **Product claims sovereign, local-first, or air-gapped speech output** | **Local TTS** **SHALL** be the **default** path when the environment is **declared** for local voice. |
| **Development** | **SHOULD** run local TTS for parity. |
| **Server runtime** | **SHALL** run TTS in the **same trust zone** as the app. |

Local TTS is **not** required for:

- Products using **only** cloud TTS **without** **§17** claims.
- **Silent** (text-only) modes.

---

## 3. Where must it be installed and running?

| Environment | Installation |
|-------------|----------------|
| **Local dev** | Engine-specific (e.g. Piper binary, Python server, ONNX runtime) exposing a **documented** **synthesize** or **speak** API. |
| **Server** | Service on **private** network; **MUST NOT** expose unauthenticated synthesis to the public internet without review. |

**Network**

- **Browser** playback **MAY** use Web Audio from **same-origin** or **trusted** backend that runs TTS.

**Configuration (informative)**

- Voice id, sample rate, endpoint — **document** in **`.env.example`** (e.g. `LOCAL_TTS_ENDPOINT`, `LOCAL_TTS_VOICE`).

---

## 4. Approved capabilities

| Capability id | Plane | Lane | Notes |
|----------------|-------|------|--------|
| `local.tts.speak` | `read` (output) | `local` | Synthesis for **playback**; **not** Gmail send — execution remains **§15**. |

**MUST NOT** mark **enabled** without **readiness** (**§5**).

---

## 5. Readiness states (normative)

| State | Meaning |
|-------|--------|
| `not_installed` | No TTS engine / service found. |
| `installed_not_running` | Engine not reachable. |
| `running_no_models` | Service up; **required voice/model** missing. |
| `running_ready` | Synthesis works; optional smoke passed. |
| `degraded` | Partial; **disclose**. |

---

## 6. Readiness checks (SHALL)

1. **Endpoint / process** reachable.
2. **Voice / model** assets present.
3. **Smoke** (optional): minimal text → audio or health probe.

**Disclosure**: Failed checks **MUST NOT** be silent for sovereign modes.

---

## 7. Fallback: remote TTS

Aligned with **AIOS-SPEC-009 §17.4** and **POL-LANE-VOICE-003**:

| Condition | Behavior |
|-----------|----------|
| Local **not** `running_ready` | **Block** or **proposal** — **never** silent remote TTS. |
| User **opts in** to cloud voice | Remote allowed; **audit** / disclose. |
| **Policy** allows | **Auditable**. |

---

## 8. Disclosure (UI / operator)

- **Local TTS**: `Ready` | `Unavailable` | `Degraded`.
- **Engine**: configured name (e.g. `piper`).
- **Fallback** policy: `Disabled` | `Proposal` | `Allowed`.

---

## 9. Security and data handling

- **Text** sent to TTS **SHALL** stay in the **trust zone** for sovereign modes.
- **Logs** **SHOULD** avoid retaining audio unless required.

---

## 10. Relationship to other documents

| Document | Role |
|----------|------|
| **AIOS-SPEC-009 §17** | Normative sovereign voice lanes. |
| **WHISPER_RUNTIME_STANDARD** | Speech-input lane. |
| **OLLAMA_RUNTIME_STANDARD** | Interpretation lane. |
| **WORKSPACE.md** | `local.tts.speak` registry row. |

---

## 11. Revision history

| Version | Date | Summary |
|---------|------|---------|
| 0.1.0 | 2026-04-04 | Initial draft. |

---

**End of LOCAL_TTS_RUNTIME_STANDARD**
