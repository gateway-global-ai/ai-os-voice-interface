# Phase 1 Conformance — Governed Workspace control-plane call graph is end-to-end enforced

## Paste into GitHub

**Title:** `[Conformance][Phase 1] Governed Workspace control-plane call graph is end-to-end enforced — AIOS-SPEC-007 / AIOS-SPEC-009`

**Conformance status:** **Partially conformant** (static call graph + `callWorkspaceMcpAdapterCallsite.test.ts`); **not** “Conformant with evidence” until runtime observation + §12.2 / §12.4 propagation + policy-sourced `resolvedIntentRequiresLocalModel` are evidenced — see artifact. May move to **Non-conformant** for a clause if runtime proves breakage.

**Branches:** Work from **`conformance/pilot-workspace-call-graph`** (or equivalent); keep **`docs/conformance/artifacts/workspace-control-plane-call-graph.md`** updated on the branch.

---

## Summary

Verify whether the live Workspace **client** path is **governed end to end** — from resolved intent through **`runWorkspaceControlPlane`** to **`callWorkspaceMcpAdapter`** and disclosure — **without** bypass paths or UI-only masking.

**Canonical pilot (copy clause anchors from here):** `docs/conformance/pilot-issue-workspace-control-plane-call-graph.md`  
**Living artifact:** `docs/conformance/artifacts/workspace-control-plane-call-graph.md`

---

## Clause anchors (mandatory before active)

See pilot doc **Governing clause(s) — exact anchors (required)** table.

---

## Done when

- Artifact §§1–8 filled with **typed** evidence (code / test / runtime / UI supplemental).
- At least one **negative** proof (e.g. `callWorkspaceMcpAdapterCallsite.test.ts`).
- **Conformance status** paragraph justified from evidence only.
- Reviewer can validate **without a verbal walkthrough**.

---

*Do not use this file as normative law; `aios-governing-docs` specifications remain authoritative.*
