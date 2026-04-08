# Quarantined artifacts (not live runtime)

- **`documentsRestApiClient.ts`** — HTTP client for the optional local documents REST server (same-origin `/api` proxy in dev). Moved here when `src/api/governance.ts` was removed from the active app so the archived governance-manager snapshot can still resolve imports without implying a “governance product” in `src/api/`.

Do not import from `src/` — this folder is for the historical snapshot only.
