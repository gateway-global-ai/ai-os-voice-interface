---
name: governance-docs-updates
description: >-
  Updates AIOS governing documents (specs, amendments, registry, peer review,
  CHANGELOG). Use when editing governing_docs, aios-governing-docs, AMD/SPEC
  drafts, DOCUMENT_REGISTRY, triangulated review, or syncing governance docs
  with the voice app. Canonical path C:\Apps\governing_docs.
---

# Governance docs updates (AIOS)

## Canonical location

| What | Where |
|------|--------|
| Local tree | `C:\Apps\governing_docs` |
| Git remote | `https://github.com/gateway-global-ai/aios-governing-docs` |
| Operator guide | `governing_docs/DEVELOPER.md` (lifecycle, API, `.env`) |

If the workspace only contains `ai-os-voice-interface`, use **absolute paths** for `governing_docs` when reading or editing.

---

## Binding rules (do not skip)

1. **Ratification path (AMD-2026-005):** Author validation → triangulated peer review → thresholds (composite ≥ 3.5, no dimension below 3) → ratification. No extra post–peer-review human audit as a workflow gate unless constitutional law already requires it.
2. **Workspace / Google (SPEC-007):** Layer 2 `workspace.*` intents map to **exactly one** Layer 1 `workspace.google.*` scope class; integrations go through control plane, not raw MCP (see voice app `src/workspace/`).
3. **Registry:** After adding or changing governed markdown with front matter under `core/`, `specifications/`, `commercial/`, `amendments/`, or `reference/`, run **`registry_generator.py`** so `DOCUMENT_REGISTRY.md` / `.json` stay accurate.
4. **Cross-references:** Prefer YAML `cross_references` / `document_id` consistent with existing specs; match `amendment_template.md` for new amendments.

---

## Edit workflow checklist

Copy and track when making substantive changes:

- [ ] Edit the right file(s); match `STYLE_GUIDE.md` and existing front matter patterns.
- [ ] If new document: add to appropriate folder; include `document_id`, `title`, `version`, `status`, `category`, `cross_references` as applicable.
- [ ] Run: `cd C:\Apps\governing_docs\scripts` then `py -3 registry_generator.py`
- [ ] Update `CHANGELOG.md` under `[Unreleased]` or dated section when the change is user-visible.
- [ ] For specs/amendments: bump `version` / `last_updated` in front matter when meaningful.

---

## Peer review (automated)

From `C:\Apps\governing_docs\scripts`:

```powershell
Set-Location C:\Apps\governing_docs\scripts
py -3 peer_review.py specifications/<Doc>.md --round 1 --rubric light --smart-context
```

Round 2: `--round 2`. Full rubric: omit `--rubric light`. Requires `.env` API keys per `DEVELOPER.md`.

---

## Common commands

| Task | Command |
|------|---------|
| Regenerate registry | `py -3 registry_generator.py` (from `scripts/`) |
| Conflict scan | `py -3 conflict_detector.py` |
| Install script deps | `py -3 -m pip install -r requirements.txt` (in `scripts/`) |

---

## Git (governing_docs repo)

```powershell
Set-Location C:\Apps\governing_docs
git status
git add -A
git commit -m "docs: <concise message>"
git push origin main
```

Use conventional prefixes: `docs:`, `feat(governance):`, `amendment:` as appropriate.

---

## Relationship to voice interface

- Governance **content** lives in `governing_docs` / **aios-governing-docs**.
- **Runtime** governance UI and Workspace integration live under `ai-os-voice-interface` (`src/governance/`, `src/workspace/`). Updating docs alone does not change app behavior; align SPEC/amendment text with code when changing binding behavior.

---

## Do not

- Edit `DOCUMENT_REGISTRY.md` or `DOCUMENT_REGISTRY.json` by hand (regenerate).
- Weaken AMD-2026-005 / SPEC-007 rules without a new amendment or ratified SPEC revision.
- Assume the repo path is inside the voice workspace without checking—use `C:\Apps\governing_docs` when paths are ambiguous.
