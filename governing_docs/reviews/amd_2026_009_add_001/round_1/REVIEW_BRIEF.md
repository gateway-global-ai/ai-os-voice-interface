# Triangulated peer review — AMD-2026-009-ADD-001 (retrieval backends & search/knowledge strategy)

## Documents under review

| Doc | Path |
|-----|------|
| Addendum | [`governing_docs/amendments/AMD-2026-009-ADD-001-retrieval-backend-neutrality.md`](../../../amendments/AMD-2026-009-ADD-001-retrieval-backend-neutrality.md) |
| Parent | [`governing_docs/amendments/AMD-2026-009.md`](../../../amendments/AMD-2026-009.md) |

**Version target:** ADD-001 **v1.0.1** (includes §2.1 DuckDuckGo / alternatives table).

## Purpose

Council seeks **three independent** technical/governance reviews (e.g. **DeepSeek R1**, **OpenAI**, **Gemini** — or any three qualified reviewers) on **how to handle search and external knowledge** under AIOS doctrine: **bounded retrieval**, **SPEC-010** envelopes, **audit**, **no quasi-browser**.

This brief is the **shared prompt** so reviewers answer the **same** questions; a maintainer then fills **`REVIEW_SYNTHESIS.md`** with consensus and conflicts.

## Instructions for each reviewer

1. Read the addendum **§2**, **§2.1**, and **§5–6**.
2. Answer **§A–E** below (scored dimensions optional — match your org’s AMD-2026-009 rubric if desired).
3. Save as `review_00N_<your_id>.md` with YAML front matter (`reviewer`, `review_date`, `disposition`, `composite_score` optional).

---

## §A — DuckDuckGo and “privacy” search

1. What is your assessment of **programmatic** access to **DuckDuckGo**-class results today (official APIs vs aggregators vs scraping) for **production** systems that must be **ToS-aware**?
2. Should **governed** AIOS implementations **prefer** a **commercial search API** (Brave, Bing, etc.) over **HTML scraping** DDG even if operators want “DDG branding”? Why?
3. What **minimum** metadata should **audit §9** record when the backend is **not** PSE (e.g. `backend_id`, aggregator contract id, engine family)?

## §B — Provider diversity (Gemini / OpenAI / DeepSeek / others)

1. How should **LLM-native** “search” or **grounding** tools be **gated** so they do **not** bypass **result_set_review** and **citable** evidence requirements?
2. Rank **risk** (for **governance**, not stock): **PSE** vs **vendor grounding** vs **third-party SERP API** vs **scraping** — for **enterprise** tenants.

## §C — Knowledge vs search

1. Where should **RAG** / **private corpus** / **knowledge bases** sit relative to **web retrieval** in the same intent pipeline (same amendment vs separate capability family)?
2. Does **ADD-001** need a **sibling** addendum later for **non-web** knowledge ingestion, or is **AMD-2026-009** scope sufficient if `web:*` keys generalize to `knowledge:*`?

## §D — Policy and register

1. Is **POL-WEB-RETRIEVAL-BACKEND-001** the right **separation of concerns** vs folding into **POL-WEB-SCOPE-001**?
2. What **must** be **forbidden at register level** (e.g. “no production scraping backends without `risk_tier: exception`”)?

## §E — Disposition

- **approved** / **approved_with_minor_revisions** / **approved_with_changes** / **rejected**
- Top **3** concrete edits (if any) to **ADD-001** or **AMD-2026-009** before ratification.

---

## After triangulation

1. Add **`REVIEW_SYNTHESIS.md`** in this folder with reviewer table, consensus, and **open risks**.
2. Link the synthesis from the addendum **§6** checklist (tick when done).
3. Optional: **Round 2** if scores diverge or Council requests legal review on **scraping** / **aggregator** terms.
