---
document_id: AIOS-SPEC-007
version: 0.1.1
status: draft
category: specification
title: Google Workspace Integration Governance
author: Gateway Global AIOS
created: 2026-04-03
last_updated: 2026-04-03
reviewers: []
ratification_target: null
supersedes: null
cross_references:
  - doc_id: AIOS-SPEC-009
    title: Intent Primitive and Execution Model
  - doc_id: AMD-2026-009
    title: Intent-Scoped Web Retrieval and Governed Website Review
  - path: WORKSPACE.md
    note: Informative operator and capability notes (repository root)
amendment_history:
  - version: 0.1.1
    date: 2026-04-03
    summary: §3 retrieval backends — PSE optional; policy-registered alternatives per AMD-2026-009-ADD-001.
  - version: 0.1.0
    date: 2026-04-03
    summary: Initial repository copy; routing model; web search / PSE alignment with AMD-2026-009 §10.
---

# AIOS-SPEC-007 — Google Workspace Integration Governance

## 0. Status

| Field | Value |
|-------|--------|
| **Status** | `draft` |
| **Framing** | Normative requirements for how the AI OS **voice / agent layer** integrates with **Google Workspace** via **MCP** and governed **intent** routing. Informative deployment and env detail **MAY** live in **`WORKSPACE.md`** (repository root); this spec states **SHALL** / **MUST** rules products **MUST** satisfy to claim compliance. |

## 1. Purpose

1. Ensure **intent** is the **only** governed entry point for Workspace capability execution from the product UI — not ad hoc tool strings or direct MCP exposure to untrusted layers.
2. Align the **integration control plane** and **MCP adapter** with **AIOS-SPEC-009** (intent primitive, execution, audit expectations).
3. Bind **web retrieval** to **policy** and **[AMD-2026-009](../amendments/AMD-2026-009.md)** (including **[ADD-001](../amendments/AMD-2026-009-ADD-001-retrieval-backend-neutrality.md)** where ratified) — **not** unconstrained public browsing. **Programmable Search Engine / Custom Search** is **one** permitted backend; **others** **SHALL** be **policy-registered**.

## 2. Normative routing model

1. The **browser or client** **SHALL** invoke Workspace capabilities **only** through the product’s **Workspace Intent Router → Integration Control Plane → MCP Adapter** (or equivalent names); it **MUST NOT** call Google Workspace MCP **tools** directly with arbitrary method names bypassing **intent** resolution and **scope class** mapping.
2. **Intent** identifiers **SHALL** conform to **AIOS-SPEC-009** and the **Phase 1** registry model (one intent → one **scope class** where the domain pack defines that mapping).
3. **OAuth** access tokens and MCP **transport** session handling **SHALL** follow the security model described in **`WORKSPACE.md`** (informative) for this repository’s implementation; **secrets** for MCP hosts **SHALL NOT** be embedded in client bundles (e.g. no **`VITE_*`** PSE API keys).

## 3. Web search and external retrieval (PSE)

This section incorporates **[AMD-2026-009](../amendments/AMD-2026-009.md)** requirements at the **integration** layer.

1. Workspace MCP tools that invoke **Programmable Search Engine (PSE)** / **Custom Search JSON API** (e.g. **`search_custom`**) **SHALL** be **policy-scoped**: the effective **search scope class** (AMD-2026-009 §4) **SHALL** be determined by **intent → capability → policy**, not by ad hoc client parameters alone.
2. Implementations **SHALL** reference **POL-WEB-SCOPE-001** (or successor in the organization policy register) for which **search scope classes** are allowed per tenant or intent.
3. The product **SHALL NOT** treat **public web search** as an unconstrained default; **`web.search.broad_public`** **SHALL** follow AMD-2026-009 §4 trigger rules (explicit intent classification, user/operator confirmation, or policy-defined escalation).
4. **PSE credentials** (**`GOOGLE_PSE_*`**, engine id, API keys) **SHALL** reside on the **MCP server** environment; they **MUST NOT** appear in browser bundles or **`VITE_*`** client env for production deployments claiming this spec.

## 4. Relationship to other documents

| Document | Role |
|----------|------|
| **AIOS-SPEC-009** | Intent primitive, execution plan, proposal/approval — **MUST** be enforced at integration boundaries. |
| **AIOS-SPEC-010** | Execution Scope Envelope — governs reads/reviews including **logical web keys** per AMD-2026-009. |
| **AMD-2026-009** | Bounded external knowledge acquisition, review modes, audit minimums. |
| **WORKSPACE.md** | Informative: operator setup, CORS, MCP URLs, troubleshooting. |

---

*End of AIOS-SPEC-007, version 0.1.1.*
