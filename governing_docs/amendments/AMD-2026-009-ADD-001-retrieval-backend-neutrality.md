---
document_id: AMD-2026-009-ADD-001
parent_amendment: AMD-2026-009
parent_version: 0.1.6
version: 1.0.1
status: draft
category: amendment_addendum
title: Retrieval backend neutrality (beyond Google PSE / Custom Search)
author: Gateway Global AIOS
created: 2026-04-03
last_updated: 2026-04-03
ratification_target: null
cross_references:
  - doc_id: AMD-2026-009
  - doc_id: AIOS-SPEC-007
  - doc_id: AIOS-SPEC-010
  - path: governing_docs/reviews/amd_2026_009_add_001/round_1/REVIEW_BRIEF.md
    note: Triangulated peer review prompt (search/knowledge strategy)
addendum_history:
  - version: 1.0.1
    date: 2026-04-03
    summary: §2.1 privacy/independent providers (DuckDuckGo et al.); triangulated peer review brief under governing_docs/reviews/amd_2026_009_add_001/.
  - version: 1.0.0
    date: 2026-04-03
    summary: Initial draft — policy-registered retrieval backends; PSE optional; exemplar providers.
---

# AMD-2026-009-ADD-001 — Retrieval backend neutrality

## 0. Status and intent

| Field | Value |
|-------|--------|
| **Status** | `draft` — **addendum** to **[AMD-2026-009](AMD-2026-009.md)** for Council / architecture review |
| **Does not replace** | **AMD-2026-009** remains the parent framework for **governed external knowledge acquisition**. This addendum **narrows** one implementation assumption: **Google Programmable Search Engine (PSE) / Custom Search JSON API** is **one** permitted **retrieval backend**, not a **mandatory** exclusive. |

## 1. Problem statement (operational)

Many deployments use **PSE** with **`GOOGLE_PSE_*`** credentials on the MCP host. Operators report that **PSE / Custom Search Engine** configuration is increasingly **manual** (e.g. site lists and engine definition via **Google Cloud / Programmable Search** consoles) and **not** always **programmatically** maintainable at the cadence required for **policy-as-code** or **frequent scope changes**.

**Governance need:** The **same** normative guarantees (**search scope classes**, **SPEC-010** envelope, **review modes**, **audit §9**) **SHALL** hold regardless of whether results come from **PSE**, a **provider-native web/grounding API**, or another **policy-approved** bounded retrieval implementation.

## 2. Normative effect (upon ratification of this addendum)

When **AMD-2026-009-ADD-001** is ratified alongside or after **AMD-2026-009**:

1. **Retrieval backend** **SHALL** be **explicitly registered** in policy (extend **POL-WEB-SCOPE-001** or add **POL-WEB-RETRIEVAL-BACKEND-001**) with: **backend id**, **allowed scope classes**, **hosting** (server-side only), and **audit reference** format (alias — **not** raw secrets in logs).
2. **Google PSE / Custom Search JSON API** **MAY** remain a **valid** backend where operators choose it; it is **not** required to be the **only** backend.
3. **Alternative backends** **MAY** include, **where product and vendor terms allow**, **bounded** retrieval APIs that return **citable result lists** (titles, snippets, URLs) suitable for **result_set_review** — for example ( **informative only** ):
   - **Google** — **Gemini**-family APIs with **grounding** / **Search** tools where the product binds **scope** and **discloses** retrieval (vendor docs change; register the concrete API surface in policy).
   - **OpenAI** — APIs that expose **web search** or **grounded** retrieval as **bounded** tool outputs (e.g. Responses API patterns), registered per tenant policy.
   - **DeepSeek** or **other providers** — only where a **documented** API returns **bounded** evidence lists under **operator control**; **MUST NOT** rely on ad hoc prompt-only “pretend to browse.”
4. **Logical resource keys** in **AIOS-SPEC-010** **`review_files`** **SHALL** support a **backend-agnostic** pattern in addition to **`web:pse:…`** (see §3).
5. **MUST NOT:** This addendum **does not** authorize **unbounded** browsing, **silent** provider switching, or **weakening** **AMD-2026-009 §4** / **§11** non-goals.

### 2.1 Privacy-first and independent index providers (informative)

Operators may prefer **non-Google** search surfaces for **privacy**, **jurisdiction**, or **vendor diversity**. Examples below are **illustrative**, not endorsements; **each** must satisfy **§2** (policy registration, bounded results, no silent weakening of parent amendment): **documented** programmatic access, **bounded** structured results, **ToS/commercial** fit, and **server-side** secrets.

| Class | Examples (informative) | Governance notes |
|-------|------------------------|------------------|
| **Independent / privacy-oriented** | **DuckDuckGo** (official offerings are **narrow** — e.g. Instant Answer / limited APIs; **not** a full public SERP product comparable to PSE for all use cases), **Brave Search API**, other **paid** search APIs | Prefer **vendor-documented** HTTP APIs with **stable** result shapes. **MUST NOT** treat **HTML scraping** or **unofficial** reverse-engineered endpoints as **governed** retrieval in production without **legal** review and explicit risk acceptance. |
| **Major index APIs** | **Bing Web Search**, **Google** programmatic surfaces **other than** PSE where licensed | Register **backend_id** per tenant; respect **quota**, **attribution**, and **region** terms. |
| **Aggregator / SERP proxies** | Third parties that return structured SERP from multiple engines | **Contract** is with the **aggregator**; still **SHALL** record **which** logical engine family was requested in **audit** metadata where knowable. |
| **LLM-native “search” tools** | **Gemini**, **OpenAI**, **DeepSeek** tool or grounding features | Already listed in §2; must still return **citable** segments for **result_set_review**, not prose-only “trust me.” |

**DuckDuckGo specifically:** There is **no** drop-in replacement for **PSE** with identical governance knobs for every tenant. If **DuckDuckGo** (or similar) is chosen, Council **SHALL** record **which** integration path is used (official limited API vs **commercial** search API product vs aggregator) and **SHALL** not claim **AMD-2026-009** compliance for **scraping**-based paths without a **separate** risk decision.

**Triangulated peer input:** See **[round_1/REVIEW_BRIEF.md](../reviews/amd_2026_009_add_001/round_1/REVIEW_BRIEF.md)** for questions to put to **three** independent reviewers (e.g. DeepSeek, OpenAI, Gemini-class) before ratifying backend diversity.

## 3. SPEC-010 logical keys (addition to AMD-2026-009 §1.2)

Implementations **SHALL** accept at least the following **generic** pattern (alongside existing **`web:pse:…`** examples):

| Example key (illustrative) | Binds |
|----------------------------|--------|
| `web:retrieval:{backend_id}:{query_fingerprint}` | One **governed** bounded retrieval call for a **policy-registered** backend **`backend_id`** and normalized query fingerprint. |

**`backend_id`** **SHALL** map to the policy register row (§2.1). **Fingerprinting** remains as in parent amendment.

## 4. Deltas to sibling artifacts (checklist)

| Artifact | Delta |
|----------|--------|
| **AMD-2026-009** | Incorporate §1.3 summary + link; optional wording tweaks in §1 Purpose flow and §3 **Web retrieval** definition (see parent amendment when merged). |
| **AIOS-SPEC-007** | §3: retrieval **SHALL** be policy-scoped for **any** registered backend, not **PSE-only**; env vars **SHALL** use **server-side** secrets for the **active** backend. |
| **WORKSPACE.md** | Informative: troubleshooting may list **non-PSE** env vars per MCP release; **PSE** remains one path. |
| **Product / MCP** | Register backends in **POL-WEB-*** ; map **`workspace.web.search`** (or successor) to **configured** backend per tenant. |

## 5. Non-goals

- **Does not** require any specific cloud vendor.
- **Does not** bless **prompt-only** web access without **bounded** API evidence and **audit**.
- **Does not** change **page_review** limits or **broad_public** triggers except through **shared** parent amendment text.

## 6. Ratification checklist (addendum)

- [ ] Council approves **AMD-2026-009-ADD-001** as amending **AMD-2026-009** implementation assumptions.
- [ ] **POL-WEB-RETRIEVAL-BACKEND-001** (or merged policy row) drafted.
- [ ] **SPEC-010** / product **review_files** validators accept **`web:retrieval:…`** where applicable.
- [ ] **WORKSPACE.md** / operator docs updated for **multi-backend** configuration.
- [ ] **Triangulated peer review** (see `governing_docs/reviews/amd_2026_009_add_001/round_1/`) completed or consciously waived with rationale.

---

*End of AMD-2026-009-ADD-001, version 1.0.1.*
