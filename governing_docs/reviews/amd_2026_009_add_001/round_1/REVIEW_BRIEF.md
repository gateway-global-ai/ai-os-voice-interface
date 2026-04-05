# Triangulated peer review — AMD-2026-009-ADD-001 (tightened product constraints)

## Product constraints (read first — non-negotiable framing)

**Intent of governed retrieval:** External search and knowledge steps exist to supply **information sufficient to**:

1. **Select or refine a skill** (capability) appropriate to the user’s goal,
2. **Shape actions** (plan steps, proposals, tool args) that are **policy-consistent**, and
3. **Produce an outcome** that is **traceable**, **auditable**, and **defensible** (not “interesting links” or open-ended research).

Reviewers **SHALL** judge ADD-001 and related doctrine against this **intent**, not against “best generic web search UX.”

**Source authority (default policy target):**

| Tier | Examples | Use |
|------|----------|-----|
| **A — Primary authority** | Official **developer documentation**, **API reference** (vendor or open-source project), **company-owned** product / security / changelog pages for the API or product in scope | **Prefer** for factual claims about behavior, limits, auth, endpoints, breaking changes, support policy. |
| **B — Secondary / corroboration** | Reputable technical publishers, standards bodies, **vendor engineering blogs** when clearly about the same product/API | When **A** is incomplete; still **cite** URL + snippet in review artifacts. |
| **C — Community (allowed when necessary)** | **Discussion boards**, **forums**, **Stack Overflow**, **GitHub issues/discussions** | **Permitted** for *practical* edge cases, version-specific bugs, workarounds, or when **A** is silent — **MUST** be labeled as **non-authoritative** in structured review output (`relevance_to_intent`, `confidence`, `source_tier` or equivalent) and **MUST NOT** override **A** on contractually normative facts (e.g. official quota limits) without explicit human/operator acknowledgment where policy requires. |

**Retrieval backends** (PSE, Bing, Brave, DDG-class, LLM grounding, aggregators) are **means**; **source-tier policy** and **review structure** are **ends** for building **skills / actions / outcomes**.

---

## Documents under review

| Doc | Path |
|-----|------|
| Addendum | [`governing_docs/amendments/AMD-2026-009-ADD-001-retrieval-backend-neutrality.md`](../../../amendments/AMD-2026-009-ADD-001-retrieval-backend-neutrality.md) |
| Parent | [`governing_docs/amendments/AMD-2026-009.md`](../../../amendments/AMD-2026-009.md) |

**Version target:** ADD-001 **v1.0.1+** (includes §2.1; peer input may drive **v1.0.2** editorial).

---

## Purpose

**Three independent** reviewers answer the **same** questions so Council can triangulate **search/knowledge strategy** under AIOS: **bounded retrieval**, **SPEC-010** envelopes, **audit §9**, **no quasi-browser**, and the **product constraints** above.

---

## Instructions for each reviewer

1. Read ADD-001 **§2**, **§2.1**, **§5–6** and AMD-2026-009 **§5.1**, **§7**, **§9** (review artifact and audit).
2. Answer **§A–F** below. Optional: score dimensions like AMD-2026-009 Round 1–2.
3. Save as `review_00N_<your_id>.md` with YAML front matter (`reviewer`, `review_date`, `disposition`, `composite_score` optional).

---

## §A — Intent: skill, action, outcome

1. Does ADD-001 (with parent AMD-2026-009) **adequately tie** retrieval to **execution-plan** concepts (**skill → action → outcome**), or is there a **gap** reviewers would close with a normative sentence or policy id?
2. What **minimum fields** (beyond AMD-2026-009 §7) would you require so retrieved evidence **cannot** silently drive execution without mapping to **skill id**, **proposed action**, and **expected outcome**?
3. Where should **“discussion-only”** evidence sit in that chain (e.g. **never** auto-promote to write-plane without gates)?

---

## §B — Source authority: docs vs forums

1. How should **governed review** encode **tier A vs C** (developer docs / company API sites vs forums) so operators can **policy-default** to **A-first** without banning **C** when necessary?
2. Should **search scope classes** (AMD-2026-009 §4) include an explicit class such as **`web.search.community_corroboration`** (or similar) with **stricter** review mode / confidence rules — **yes/no** and rationale?
3. What **abuse cases** do you see (e.g. forum spam ranked high) and what **guardrail** (snippet-only, result_set_review required, operator-only) would you mandate?

---

## §C — Retrieval backends (programmatic reality)

1. For **tier-A-heavy** queries (documentation navigation), which **backend classes** (PSE, Bing, Brave, DDG-class APIs, aggregators) are **fit for purpose** vs **misleading**?
2. **DuckDuckGo-class** surfaces: given **ToS** and **API** limits, what is your recommendation for **production** governed paths — **official/supported API only**, **aggregator contract**, or **out of scope** unless exception?
3. What **audit §9** fields are **mandatory** when results mix **domains** (e.g. `docs.vendor.com` vs `stackoverflow.com`) — e.g. **per-result domain class**, **backend_id**, **query_fingerprint**?

---

## §D — LLM-native search / grounding vs evidence

1. How must **vendor grounding** (Gemini / OpenAI / others) be **gated** so **tier-A** facts are not **hallucinated** atop snippets — align with **result_set_review** and **§7.1**?
2. Rank **governance risk** for **enterprise**: **PSE** vs **vendor grounding** vs **third-party SERP API** vs **scraping** — **for intent = skill/action/outcome**.

---

## §E — Policy register

1. Is **POL-WEB-RETRIEVAL-BACKEND-001** still the right split from **POL-WEB-SCOPE-001**, or should **source-tier defaults** get their own policy row (**POL-WEB-SOURCE-TIER-001**)?
2. What **must** be **forbidden at register level** for this product (e.g. **no** unlabeled **tier C** as authoritative; **no** production scraping without `risk_tier: exception`)?

---

## §F — Disposition

- **approved** / **approved_with_minor_revisions** / **approved_with_changes** / **rejected**
- Top **3** concrete edits to **ADD-001**, **AMD-2026-009**, or **policy register** before ratification — **especially** any change that encodes **A-first docs**, **C-when-needed**, and **skill/action/outcome** linkage.

---

## After triangulation

1. Complete **`REVIEW_SYNTHESIS.md`** with reviewer table, **consensus**, **conflicts**, and **recommended policy ids**.
2. Tick ADD-001 **§6** checklist when triangulation is done or **waived with rationale**.
3. **Round 2** if scores diverge by more than **1.0** on composite or Council wants **legal** sign-off on **forum** / **aggregator** use.
