# Archived governance-manager UI (historical snapshot)

**Not part of the live AI OS shell runtime.** This folder preserves the pre-removal “governance canvas” experiment (work-mode hub, documents, amendments, compliance, related overlays).

**Current live app:** Workspace surfaces and shell authority live under `src/shellCanvas/` and `src/shell/`. There is no `src/governance/` in the active tree.

**Date archived:** 2026-04-07 · **Import paths repaired:** 2026-04 (Pass 2)

**Contents**

- `src-governance-snapshot/` — frozen copy of the old governance canvas module (pre–workspace-only severance).
- `_quarantine/documentsRestApiClient.ts` — optional local documents REST client (dev `/api` proxy). Quarantined here after removal from `src/api/` so this snapshot does not depend on a misleading `src/api/governance.ts` filename.
- Top-level `*.tsx` — overlay references copied from `src/overlays/` for historical comparison.

**Do not** wire these into `main.tsx` or `src/` without an explicit product decision. Typecheck is not guaranteed; `tsconfig` excludes `archive/`.
