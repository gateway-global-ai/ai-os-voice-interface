<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/413c0f9d-a0bc-4e79-b671-30bd867ef402

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in a `.env` or `.env.local` file in the **parent `Apps` folder** (same level as this project, e.g. `C:\Apps\.env`). Vite is configured with `envDir` pointing there so one key can serve multiple apps under `Apps`.
3. Run the app:
   `npm run dev` — opens **http://localhost:5173** (port set in `vite.config.ts`; use `npx vite --port=YOUR_PORT` if 5173 is taken).

**Secrets:** Client-bundled provider keys (e.g. Gemini via Vite `define`) are **demo / local-dev only** unless you add a server or proxy that holds long-lived secrets. **Do not** ship a public production build that embeds those keys. See **[docs/pre-workplace-checklist.md](docs/pre-workplace-checklist.md)** (pre–Workplace Phase 1 gate: secret boundary, structured intent, no Workspace bypasses).

## AIOS Governance (canvas surfaces, not dashboards)

Intent discovery, onboarding states, and promotion to reusable capabilities are specified in **[governing_docs/specifications/IntentDiscoveryOnboardingFramework.md](governing_docs/specifications/IntentDiscoveryOnboardingFramework.md)** (`AIOS-SPEC-008`, draft).

The **intent primitive** (schema, lifecycle, UI contract, governance chain) is **[governing_docs/specifications/IntentPrimitiveAndExecutionModel.md](governing_docs/specifications/IntentPrimitiveAndExecutionModel.md)** (`AIOS-SPEC-009`, draft), aligned with **[governing_docs/amendments/AMD-2026-007.md](governing_docs/amendments/AMD-2026-007.md)**. Pre-ratification conformance: **[governing_docs/specifications/AIOS-SPEC-009-CONFORMANCE-TEST-V1.md](governing_docs/specifications/AIOS-SPEC-009-CONFORMANCE-TEST-V1.md)**.

Governance uses **one canvas at a time**, starting from **`governance_hub`**: an **intent surface** for the current actor (founder) with work modes (**Review Docs**, **Discuss Documents**, **Planning Assistant**, **Research Assistant**, **Amendment Program**). The **Amendment Program** runs the demo workflow for template **AMD-2026-004** (simulated peer review, synthesized plan, console log; **no automatic merge** into repo files). Intent: `governance.amendment.workflow`. The full document library, filters, compliance, and lifecycle are **not** shown together on first paint — they open inside the relevant mode or via intent (`document_list`, `document_view`, `conflict_results`, etc.). Intents use **`INTENT_JSON:…`** after each agent reply (`governance.documents.list` → hub, not the raw library). **`GovernanceCanvasProvider`** (`src/governance/GovernanceCanvasContext.tsx`) is the **only** place that opens/closes the canvas, handles backdrop/back, runs **`loadData`** (async fetch via `src/governance/loadGovernancePayload.ts` → `canvasBridge`), and writes the **frozen** audit set: `intent_parsed`, `intent_fallback_used`, `view_opened`, `policy_denied`, `view_closed`, `backdrop_dismiss` (`governanceAudit.ts`). Denial TTS uses **`PolicyDeniedHandler`** only (`policyDeniedContract.ts`). UI transitions are constrained in `canvasTransitions.ts`. Overlays receive **resolved payload + `dataPhase`**. Document list search is **list-scoped** only: **`runSearch` / `clearSearch`** + **`searchProjection`** (`governanceSearch.ts` → bridge). Compliance **run validation** still calls the bridge from the surface until multiple compliance flows justify a provider method.

1. From `governing_docs\scripts`: `py -m uvicorn governance_api:app --host 127.0.0.1 --port 8100`
2. `npm run dev` — Vite proxies `/api/*` to `http://127.0.0.1:8100/v1/*`.

**Backdrop:** on the **hub**, dismiss closes the canvas; on other surfaces, dismiss steps back (e.g. list → work mode → hub). **Menu → Governance** closes the menu and opens the **intent hub** (explicit user action).
