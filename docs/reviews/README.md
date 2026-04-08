# Development peer review archive (`ai-os-voice-interface`)

This tree holds **development** triangulation artifacts — **mirrored** from the governance pattern in **`aios-governing-docs/reviews/`**, but scoped to **implementation** (code, UX, intent flows).

**Process:** [`docs/implementation/AIOS-DEVELOPMENT-TRIANGULATION-PROCESS.md`](../implementation/AIOS-DEVELOPMENT-TRIANGULATION-PROCESS.md) (**AIOS-DEV-TRI-001**).

**Governing ratification (real, not a simulation):** **`aios-governing-docs`** — **AIOS-DEV-PROC-001**, **AIOS-COUNCIL-BRIEF-003**, peer packet **`reviews/aios_dev_conformance_process/`**, motion **AIOS-RAT-MOTION-DEV-PROC-001**. Until **AIOS-DEV-PROC-001** is **`ratified`**, product triangulation is **draft** operationally.

**Validate packages:** `npm run check:dev-review` (optional `--topic <slug>`).

**Ollama UI review (BL-007):** `npm run dev-review:ollama -- --surface "…" --journey "…"` — add `--dry-run` to verify RAG without calling Ollama; set **`AIOS_GOV_DOCS_ROOT`** to your `aios-governing-docs` clone for law excerpts. Output: `--out docs/conformance/artifacts/ui-review-last.md`.

**Not normative law:** Folder reviews do **not** ratify amendments; they evidence **product conformance**; **AIOS-DEV-PROC-001** ratification is **governing** process law for when triangulation becomes **binding**.

---

## Layout

```
docs/reviews/dev_triangulation/
├── README.md
├── META_PROMPT_TEMPLATE.md
└── {topic_slug}/
    ├── SCOPE.md
    ├── KB_MANIFEST.md
    ├── round_1/ … round_2/
    ├── revision_log.md
    ├── REVIEW_SYNTHESIS.md
    └── DEV_REVIEW_GATE_REPORT.md
```

---

## Relationship to GitHub

AIOS development review is **in-repo** (models + humans), like governance — not a substitute for **CI** or **required GitHub approvals** unless your program explicitly ties them.
