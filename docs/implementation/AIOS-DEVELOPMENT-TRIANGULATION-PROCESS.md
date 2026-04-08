# AI OS development triangulation process

**Document ID:** AIOS-DEV-TRI-001 (product-local; non-normative)  
**Repository:** `ai-os-voice-interface`  
**Governing ratification (binding process law):** `aios-governing-docs/reference/implementation/AIOS-DEVELOPMENT-CONFORMANCE-PROCESS.md` (**AIOS-DEV-PROC-001**, **`draft`** until peer review + **AIOS-COUNCIL-BRIEF-003** vote). **Peer review packet:** `aios-governing-docs/reviews/aios_dev_conformance_process/`. **Motion:** `RATIFICATION-MOTION-AIOS-DEV-PROC-001.md`.  
**Mirrors:** `aios-governing-docs/reviews/README.md` — **5-stage peer review pipeline** and **triangulation** (independent model reviews + synthesis).  
**Normative law:** `aios-governing-docs` — this process **does not** replace **AMD-2026-005** amendment ratification; it **implements** conformance pressure on **code and UX** the same way governance applies pressure on **normative text**.

**Companion:** [UI review agent](AIOS-IMPLEMENTATION-CONTROL-PROGRAM.md#ui-review-agent-ollama--governed-knowledge-base) (**BL-007**, Ollama); this document defines the **full multi-agent** lane including **DeepSeek**, **OpenAI**, and **Gemini**.

---

## Purpose

Apply the **same structural discipline** as governance peer review to **development**: multiple **independent** reviewers, each **meta-prompted** with the **full knowledge base** relevant to the decision, then **synthesis**, **revision**, and a **second round** before treating work as **review-complete**. **Agency without ability** is avoided by **mandatory KB attachment** and **diagrammed** reasoning to **three levels of depth** (see below).

---

## Pipeline (mirrored from governance)

Governance uses: **Draft → Round 1 (2+ models) → Revision → Round 2 (3 models) → Ratification gate**.

Development uses:

| Stage | Governance analogue | Development action |
|-------|---------------------|--------------------|
| **1 — Change package** | Draft | Scoped **PR / feature / milestone** with explicit **governing citations** and **acceptance criteria**. |
| **2 — Round 1 triangulation** | Round 1 | **Three independent reviews:** **DeepSeek**, **OpenAI**, **Gemini** — same meta-prompt + KB bundle; **no** cross-talk before filing. |
| **2b — UI parallel lane** | Kernel shadow (optional parallel) | **Ollama** agent (**UI / workflow** focus) runs **in parallel** with Round 1 (and again in Round 2). **Binding** triangulation remains the **three cloud models**; Ollama is **required for UI-heavy** changes and **advisory** for gate unless program elevates it. |
| **3 — Revision** | Revision | Author (or team) responds in **`revision_log.md`**; code/docs updated as needed. |
| **4 — Round 2 triangulation** | Round 2 | **DeepSeek + OpenAI + Gemini** repeat on revised package; **Ollama** repeats **2b** on the same scope. |
| **5 — Development gate** | Ratification gate | **`REVIEW_SYNTHESIS.md`** + **`DEV_REVIEW_GATE_REPORT.md`** — disposition: `ready_to_merge` \| `changes_requested` \| `major_revision_required`. |

**Thresholds (aligned with governance practice):** Use a **published rubric** (see [Development rubric](#development-rubric-dimensions)); typical gate: **composite ≥ 3.5** and **no dimension below 3** on scored dimensions — **unless** council sets a different bar for a given release.

---

## Agents and roles

Each agent is **meta-prompted** as: *You are a senior reviewer with full access to the attached knowledge base; your expertise combines **ratified AI OS governance** and **this interface codebase**; optimize for **traceability**, **testability**, and **user-safety of shell authority**.*

| Agent | Primary pressure |
|-------|------------------|
| **DeepSeek** | Implementation depth, edge cases, failure modes, performance foot-guns. |
| **OpenAI** | Architecture fit (**ADR-001** core vs interface), refactor risk, test strategy. |
| **Gemini** | Cross-surface consistency, ambiguity, residual loopholes (similar enforceability pressure to governance reviews). |
| **Ollama (local)** | **UI / intent workflow** alignment, disclosure copy, **§7** plausibility from **described** states, graded output per [UI review agent](AIOS-IMPLEMENTATION-CONTROL-PROGRAM.md#ui-review-agent-ollama--governed-knowledge-base) — **must** use **RAG** over the same KB bundle. |

All four receive the **same** **KB bundle** for the review run (see below).

---

## Knowledge base bundle (mandatory for every review run)

**Rule:** No review is valid if reviewers did not receive the **same** explicit bundle. **Paste or attach** the bundle index in each `review_*.md` header.

| Layer | Minimum contents |
|--------|-------------------|
| **Law** | Relevant excerpts or pinned versions from **`aios-governing-docs`** (e.g. **AMD-2026-012**, **AIOS-SPEC-009** §12, **AIOS-SPEC-007** routing, **AIOS-POLICY-INDEX** entries cited by the change). |
| **Program** | **`AIOS-IMPLEMENTATION-CONTROL-PROGRAM.md`**, **`AIOS-MASTER-IMPL-001`** excerpts if cross-repo scope touched. |
| **Interface** | **`WORKSPACE.md`**, affected **`src/`** paths, **`docs/conformance/`** artifacts, **intent router** / **ICP** references. |
| **Decision** | PR description, diff summary, **BL-*** backlog IDs, **test plan**, screenshots or **DOM** notes if UI. |

**RAG:** For **Ollama**, the bundle is **retrieved** from the indexed corpus (see **BL-007**); cloud models receive the bundle **in full** in context or as structured attachments **up to model limits** — if limits bind, **chunk by section** with a **manifest** so no reviewer lacks a cited section.

---

## Meta-prompt skeleton

Use [`docs/reviews/dev_triangulation/META_PROMPT_TEMPLATE.md`](../reviews/dev_triangulation/META_PROMPT_TEMPLATE.md) for every Round 1/2 run. It requires:

1. **Role** (governance + UI + codebase).  
2. **KB bundle** (manifest + excerpts).  
3. **Questions** (change-specific, from triangulation coordinator).  
4. **Outputs:** scorecard, disposition, **three-level diagrams** (see below), citations.

---

## Diagrams — three levels of depth (required)

Every review **must** include **at least one diagram** at **each** level (mermaid preferred in markdown).

| Level | What it shows | Example |
|-------|----------------|--------|
| **L1 — User journey** | Actor goals, steps, entry/exit — **what the user experiences**. | Flowchart: idle shell → intent → outcome. |
| **L2 — Surface / state** | **Shell** surface mode, canvas, hub, **workspace** views — **UI state machine** slice. | State diagram: `primary` ↔ `operator`, workspace hub open/closed. |
| **L3 — Logic / control** | **Intent** classification, **router**, **ICP**, **policy predicates**, **disclosure inputs** — **where law meets code**. | Sequence diagram: intent string → `workspaceIntentRouter` → MCP adapter guard. |

Deeper nesting inside L3 (e.g. function-level) is allowed; **L1–L3** are the **minimum**.

---

## Artifacts and folder layout

```
docs/reviews/dev_triangulation/
├── README.md
├── META_PROMPT_TEMPLATE.md
└── {topic_slug}/                 # e.g. pr-142-workspace-disclosure
    ├── SCOPE.md                  # change package — stage 1
    ├── KB_MANIFEST.md            # bundle index + hashes / refs
    ├── round_1/
    │   ├── review_001_deepseek.md
    │   ├── review_002_openai.md
    │   ├── review_003_gemini.md
    │   └── review_004_ollama_ui.md   # parallel UI lane
    ├── round_2/
    │   └── (same numbering convention)
    ├── revision_log.md
    ├── REVIEW_SYNTHESIS.md
    └── DEV_REVIEW_GATE_REPORT.md
```

Naming aligns with **`aios-governing-docs/reviews/`** conventions for easy cross-training of humans and tooling.

---

## Development rubric dimensions

Use **scored 1–5** dimensions (adjust list by program; keep **published** per review cycle):

1. **Governance traceability** — cites to doc ID + section.  
2. **Shell authority** — no tool-first or bypass of shell entry / fallback (**AMD-2026-012**).  
3. **Intent / routing correctness** — **SPEC-007** / **SPEC-009** alignment.  
4. **Disclosure & transparency** — **§12.2** honesty, local model when required.  
5. **Architectural fidelity** — **ADR-001** core vs interface.  
6. **Test & evidence** — tests, traces, conformance artifacts.  
7. **Completeness** — scope fully addressed.  
8. **Conflict freedom** — no contradiction with ratified law.  
9. **Practical operability** — ship-ready, not theoretical.  
10. **UI / workflow clarity** — L1–L3 diagrams coherent with code.

**Composite:** mean of dimensions, one decimal. **Gate:** align with governance thresholds unless waived in **`SCOPE.md`**.

---

## Relationship: UI review agent (BL-007)

**BL-007** is implemented as **`npm run dev-review:ollama`** (`scripts/uiReviewAgent.ts`, lexical RAG + **`AIOS_GOV_DOCS_ROOT`**). **AIOS-DEV-TRI-001** defines how **Ollama** participates alongside **DeepSeek / OpenAI / Gemini** in the **same** triangulation **process**.

---

## Backlog ownership

| ID | Link |
|----|------|
| **BL-007** | **Done** — `npm run dev-review:ollama` — [`AIOS-IMPLEMENTATION-CONTROL-PROGRAM.md`](AIOS-IMPLEMENTATION-CONTROL-PROGRAM.md) |
| **BL-008** | **Done** — `npm run check:dev-review` + CI — [`AIOS-IMPLEMENTATION-CONTROL-PROGRAM.md`](AIOS-IMPLEMENTATION-CONTROL-PROGRAM.md) |

---

*End of AIOS-DEV-TRI-001 v1.0.*
