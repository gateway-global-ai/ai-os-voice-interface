# Google Workspace integration (governed)

This app implements **AIOS-SPEC-007** (`governing_docs/specifications/GoogleWorkspaceIntegrationGovernance.md`): intents route through the **Workspace Intent Router → Integration Control Plane → MCP Adapter**; the voice/agent layer does **not** call Google Workspace MCP tools directly.

## MCP adapter (HTTP)

The browser calls **`runWorkspaceControlPlane` → `callWorkspaceMcpAdapter`** only. The adapter performs streamable **initialize** → **`Mcp-Session-Id`** → **`tools/call`** to `{VITE_WORKSPACE_MCP_URL}{VITE_WORKSPACE_MCP_JSONRPC_PATH}` with **`Accept: application/json, text/event-stream`**. Governed **intent** ids are mapped to **server tool names** in **`src/workspace/mcpIntentToolMap.ts`** (not raw `workspace.*` strings).

### Browser vs Gateway Node (CORS)

| Path | CORS? | Env (typical) |
|------|--------|----------------|
| **This app** — `fetch` from the browser to `mcp.*` | Yes — cross-origin unless MCP sends **`Access-Control-Allow-Origin`** or you use the Vite **`/__workspace_mcp`** proxy in dev | **`VITE_WORKSPACE_MCP_URL`**, **`VITE_WORKSPACE_MCP_*`** |
| **Gateway (or similar)** — UI → same-origin **`/api/...`** → Node calls MCP | No — server-side `fetch` is not browser CORS | **`WORKSPACE_MCP_URL`**, **`WORKSPACE_MCP_ADAPTER_MODE`** (e.g. `external_mcp`), plus a streamable client (**`initialize`**, **`Mcp-Session-Id`**, **`Accept`**) in that codebase |

This repo implements only the **first** row. A Node `workspaceMcpAdapter` / `mcpStreamableHttpClient` lives with the API server that serves **`/api`**, not here.

### FastMCP streamable HTTP — which “session”?

On **FastMCP streamable HTTP**, errors like **“Missing session ID”** refer to the **MCP transport** session, not a React session, not LLM `_meta.session_id`, and not the optional governance field **`session_id`** on **`WorkspaceRoutingEnvelope`**.

**Server-expected flow:**

1. **`POST`** `{base}/mcp` with **`Accept: application/json, text/event-stream`**, JSON-RPC **`initialize`**.
2. Read **`mcp-session-id`** / **`Mcp-Session-Id`** from **response headers**.
3. **`POST`** **`tools/call`** to the **same URL** with **`Mcp-Session-Id: <that value>`** and **`Authorization: Bearer <Google OAuth access token>`** for the user (from your auth layer / env such as **`WORKSPACE_MCP_BEARER_TOKEN`** on the server — not something the LLM fabricates).

There is **no** standard need to stuff transport state into **`params._meta`** for this; the transport session is the **`Mcp-Session-Id`** header after **`initialize`**.

**Where it should run:** The handshake belongs in a **server** adapter (e.g. Gateway **`executeWorkspaceGovernedAction` → `callMcpToolStreamableHttp`** in **`server/services/mcpStreamableHttpClient.ts`**). *In that file, “session” means MCP **`mcp-session-id`**, not app user session — avoid regressing to the wrong model.*

**This repo’s browser adapter** (**`callWorkspaceMcpAdapter`**) runs **`initialize` → session → `tools/call`** and sends **`Authorization: Bearer`** from the in-tab GIS session (**Sign in with Google**) when present, else from **`VITE_WORKSPACE_MCP_BEARER_TOKEN`** / **`VITE_GOOGLE_OAUTH_ACCESS_TOKEN`** in **`.env.local`** (dev-only fallback; do not ship static tokens in production client bundles).

### Google Cloud Console — Web client for Sign in with Google (this app)

For **`VITE_GOOGLE_OAUTH_CLIENT_ID`** (OAuth 2.0 client type **Web application**):

| Field | Typical values |
|--------|----------------|
| **Authorized JavaScript origins** | `http://localhost:5173`, `http://127.0.0.1:5173`, and your production app origin (`https://your.domain`). Required for [Google Identity Services](https://developers.google.com/identity/gsi/web) token client. |
| **Authorized redirect URIs** | Not required for the GIS **token** popup flow used here; add redirect URIs only if you add a server-side OAuth code flow later. |

Use the **same Google Cloud project** as your Workspace MCP’s **`GOOGLE_OAUTH_CLIENT_ID`** when you want tokens accepted by the MCP (or ensure the MCP validates tokens for that client / project per its docs).

### OAuth 2.1 — bearer token source

With **`MCP_ENABLE_OAUTH21=true`**, the MCP expects a **valid Google access token** on **`initialize`** and **`tools/call`**. This app uses **Google Identity Services** (token client) in the browser — not a server redirect/PKCE code flow — so consent appears in Google’s popup when you click **Sign in with Google**.

- **In-app:** **Sign in with Google** in the Workspace hub / onboarding (`VITE_GOOGLE_OAUTH_CLIENT_ID` + **Authorized JavaScript origins**). The access token is kept **in memory** for the tab session and sent as **`Authorization: Bearer`** to the MCP (preferred over pasting **`VITE_WORKSPACE_MCP_BEARER_TOKEN`**).
- **Manual / CLI:** complete OAuth elsewhere (MCP host, OAuth Playground, `workspace-cli`) and optionally set **`VITE_WORKSPACE_MCP_BEARER_TOKEN`** for dev.
- **Production direction:** prefer a **backend** that stores refresh tokens; avoid shipping static bearer strings in client bundles.

**Troubleshooting — `OAuth 2.1 mode requires an authenticated user … but none was found`:** The Python server sets `authenticated_user_email` in **`AuthInfoMiddleware`** only after it can validate the Bearer token (External OAuth mode calls Google **userinfo** for `ya29.*` tokens). Fix on the **host:** set **`EXTERNAL_OAUTH21_PROVIDER=true`** (with **`MCP_ENABLE_OAUTH21=true`**) so GIS/browser tokens are accepted; ensure GIS scopes include **userinfo.email** (this app uses explicit `userinfo.email` / `userinfo.profile` in **`WORKSPACE_GIS_OAUTH_SCOPES`**); ensure **nginx** forwards **`Authorization`** to the upstream (see **[docs/workspace-mcp-nginx-deploy.md](docs/workspace-mcp-nginx-deploy.md)**). After changing scopes, use **Sign in with Google** again with **`prompt: 'consent'`** (or **Refresh token**) so Google re-issues a token with the new scopes.

**Troubleshooting — Drive `403` / `insufficient authentication scopes`:** The access token must include **`https://www.googleapis.com/auth/drive.readonly`** (see **`WORKSPACE_GIS_OAUTH_SCOPES`** in **`src/workspace/workspaceSessionAuth.ts`**). If you signed in before Drive was added to the app, **Sign out**, then **Sign in with Google** again so the consent screen includes Drive. In **Google Cloud Console**, ensure **Google Drive API** is enabled for the project and the OAuth consent screen lists the Drive readonly scope if your app is in testing / verification.

**Troubleshooting — Contacts / People API `403` / `ACCESS_TOKEN_SCOPE_INSUFFICIENT`:** Include **`https://www.googleapis.com/auth/contacts.readonly`** in GIS scopes (same file). **`search_contacts`** uses **People API** — add the contacts readonly scope to the OAuth consent screen if required, then **Sign out** and **Sign in with Google** again to re-consent.

**Troubleshooting — `SERVICE_DISABLED` / “People API has not been used in project … or it is disabled”:** This is **not** an OAuth/nginx issue. In **Google Cloud Console**, open the **same project number** shown in the error (or the project that owns the OAuth client / credentials used to call Google) and **enable** the API (e.g. **People API** for Contacts). Wait a few minutes after enabling, then retry. The error often includes a direct **activation** link to that project.

**Troubleshooting — Web search / `search_custom` / `GOOGLE_PSE_API_KEY` not set:** Enabling **Custom Search API** in Cloud Console is required but **not sufficient**. The **Workspace MCP server** (the process that runs `search_custom`) must have **`GOOGLE_PSE_API_KEY`** and **`GOOGLE_PSE_ENGINE_ID`** in **its** environment — create an API key with Custom Search API access, create a [Programmable Search Engine](https://programmablesearchengine.google.com/) and use its **Search engine ID** (`cx`). Restart the MCP after changing env. These variables are **not** set in this voice app’s **`VITE_*`** files; they do not belong in the browser bundle.

## Phase 1

- **Read plane** intents only (`src/workspace/intentRegistry.ts`).
- **Layer 2 → Layer 1:** each intent maps to exactly one `workspace.google.*` scope class (`src/workspace/scopeClasses.ts`).
- UI shells: `workspace_hub`, `workspace_calendar_hub`, `workspace_mail_hub` (canvases in `src/overlays/WorkspaceHubSurface.tsx`). Mail search (`workspace.mail.search` on load) — spec & QA: **[docs/workspace-gmail-read-search-slice.md](docs/workspace-gmail-read-search-slice.md)**, **[docs/workspace-gmail-read-qa.md](docs/workspace-gmail-read-qa.md)**.

## Configuration

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | OAuth 2.0 **Web** client ID for in-app Sign in with Google (GIS). Needs **Authorized JavaScript origins** for your dev/prod URLs. |
| `VITE_WORKSPACE_MCP_URL` | Base URL of the external Google Workspace MCP server. If unset, the MCP adapter returns `not_configured`. |
| `VITE_WORKSPACE_MCP_JSONRPC_PATH` | Optional. Path for JSON-RPC `POST` (default `/mcp`). The adapter sends `tools/call` for intents such as `workspace.calendar.list`. |
| `VITE_WORKSPACE_MCP_TIMEOUT_MS` | Optional. Request timeout in ms (default `30000`). |
| `VITE_WORKSPACE_MCP_PROXY` | Optional. Set **`false`** to disable the **`/__workspace_mcp`** dev proxy in **`vite.config.ts`**. |
| `VITE_WORKSPACE_MCP_PROXY_TARGET` | Optional. Override proxy upstream (default **`https://mcp.gatewayglobal.ai`**). |
| `VITE_WORKSPACE_MCP_BEARER_TOKEN` | Optional. Google OAuth **access token** (`ya29…`) for MCP OAuth 2.1. **Local dev only** — unsafe in shipped production bundles. |
| `VITE_GOOGLE_OAUTH_ACCESS_TOKEN` | Optional alias for **`VITE_WORKSPACE_MCP_BEARER_TOKEN`**. |
| `VITE_WORKSPACE_MCP_INCLUDE_USER_EMAIL` | If **`true`**, send **`user_google_email`** in tool args (legacy single-user MCP). Default: omit (OAuth 2.1). |
| `VITE_AIOS_GOOGLE_USER_EMAIL` | Used only when **`VITE_WORKSPACE_MCP_INCLUDE_USER_EMAIL=true`**. |

In **this repo**, define **`VITE_*`** in **`.env.local`** (see **`.env.example`**). The MCP server’s **`GOOGLE_OAUTH_*`** and other host secrets belong only on the server’s **`.env`**, not in the voice app.

**Local dev vs CORS:** A **`fetch`** from **`http://localhost:5173`** to **`https://mcp.…`** is cross-origin; without **`Access-Control-Allow-Origin`** on the MCP host, the browser reports **Failed to fetch** and the adapter returns **`http_error`**. For development, set **`VITE_WORKSPACE_MCP_URL=/__workspace_mcp`** — Vite proxies **`/__workspace_mcp`** → **`https://mcp.gatewayglobal.ai/googleworkspace`** (see **`vite.config.ts`**). **Production** builds should use the full **`https://…/googleworkspace`** URL; configure **CORS** on nginx (or the MCP) for your app origin — **[docs/workspace-mcp-nginx-deploy.md](docs/workspace-mcp-nginx-deploy.md)**.

## MCP server deployment (Phase 1)

**Server source (Gateway org):** **[gateway-global-ai/aios_google_workspace_mcp](https://github.com/gateway-global-ai/aios_google_workspace_mcp)** — maintained fork of the Google Workspace MCP stack (includes `Dockerfile`, `docker-compose.yml`, Helm under `helm-chart/workspace-mcp`, and upstream-aligned docs for **`--transport streamable-http`**, OAuth 2.1, stateless mode, and **`WORKSPACE_EXTERNAL_URL`** behind a reverse proxy). Pin a release tag or commit in your deployment layer when upgrading.

**Target shape:** host that server as its **own service** on the **same machine** as the AI OS app (or same private network), not inside this frontend repo.

| Piece | Recommendation |
|--------|----------------|
| **Process** | Separate container or systemd unit; **independent** restart/deploy from `ai-os-voice-interface`. |
| **Listen** | **`127.0.0.1:<port>`** (or private interface only) until you intentionally expose it behind TLS. |
| **Port** | Any free port (e.g. **8787** or **8000**). Avoid colliding with other local services (this repo’s governance API example uses **8100** in `README.md`). |
| **Transport** | **Streamable HTTP** where the upstream supports it; align **`VITE_WORKSPACE_MCP_JSONRPC_PATH`** with the server’s JSON-RPC POST path (default **`/mcp`** in this app). |
| **Auth model** | **OAuth 2.1 multi-user** and **stateless** mode per upstream docs — suitable for central hosting. Do **not** use **`--single-user`** for production central hosting (see SPEC-007). |

### Google OAuth scopes (MCP server)

The Google Cloud **OAuth consent screen** can list many APIs/scopes you approved for the project. The MCP host does **not** necessarily request every scope on each sign-in. In **[aios_google_workspace_mcp](https://github.com/gateway-global-ai/aios_google_workspace_mcp)**, **`get_scopes_for_tools()`** builds the requested set from:

- **`BASE_SCOPES`**, plus  
- scopes for **only the tools you enabled** (see **`TOOL_SCOPES_MAP`**), using either the full map or **`TOOL_READONLY_SCOPES_MAP`** when read-only mode is on.

If **granular permissions** mode is active, scope selection uses **`get_all_permission_scopes()`** instead (see the same module and **`auth/permissions.py`**).

So the Console configuration is the **universe** of scopes the MCP *may* use; the consent flow reflects the **subset** for your enabled tools plus base identity scopes, modulated by read-only vs full access, or granular permissions, as configured on the server.

#### Google Cloud Console — align scopes with the fork (`scopes.py`)

Canonical OAuth scope strings are defined in **[aios_google_workspace_mcp](https://github.com/gateway-global-ai/aios_google_workspace_mcp)** (e.g. **`scopes.py`**, **`TOOL_SCOPES_MAP`**, **`SCRIPT_SCOPES`**). Do **not** add scopes in Cloud Console just because the API picker lists them unless this server actually requests them. There is no **`https://mail.google.com/`**, no **`gmail.addons.*`**, no **`gmail.insert`**, no **`cloud-platform`**, and no extra Calendar rows (e.g. `calendar.app.created`, `calendar.acls*`, `calendar.calendarlist*`, `calendar.calendars`, `calendar.events.freebusy`, `calendar.events.public.readonly`) in that code path — only the **Calendar** scope strings the fork lists (typically three strings; broader `calendar` may subsume many narrower ones for Google’s verification UI, but **`get_scopes_for_tools()`** only asks for the strings in **`scopes.py`**).

| Often added by mistake | Notes |
|------------------------|--------|
| `.../auth/gmail.addons.current.*` | Gmail **add-on** scopes — not used by this MCP. |
| `.../auth/cloud-platform` | Entire GCP account — not required for Workspace APIs; remove unless another product needs it. |
| `https://mail.google.com/` | Full Gmail — MCP uses granular **`gmail.*`** from **`scopes.py`**, not this URL. |
| `.../auth/gmail.insert` | Not in **`scopes.py`**. |
| Extra Calendar scopes (see list above) | Not the strings in **`scopes.py`**; keep Calendar rows aligned with the fork only. |
| Extra Drive (`drive.metadata*`, `drive.meet.readonly`, `drive.activity*`, `drive.scripts`, …) | MCP Drive usage is **`drive` / `drive.readonly` / `drive.file`** only; Apps Script uses **`script.*`** via **`SCRIPT_SCOPES`**, not **`drive.scripts`**. |

**Practical recommendation:** Align the OAuth client with **`BASE_SCOPES` ∪ scopes from `get_scopes_for_tools()`** for your enabled tools (full vs **`TOOL_READONLY_SCOPES_MAP`**, or granular **`auth/permissions.py`**). Easiest check: run the server once and inspect the **auth URL** or logs, or print **`get_scopes_for_tools()`** for your **`tools_to_import`**. Remove unused rows to reduce verification burden and consent friction. Narrow **`--tools` / `--tool-tier` / `--read-only` / `--permissions`** in **`main.py`** (per upstream) and drop the matching API scopes from the client so consent stays minimal.

**Separate deployment repo (recommended):** keep **only** your ops layer next to a **clean clone, git submodule, or pinned fork** of **[aios_google_workspace_mcp](https://github.com/gateway-global-ai/aios_google_workspace_mcp)**, with the server checkout **pinned** by tag or commit:

- `docker-compose.yml` and/or **systemd** unit
- **`.env`** / secrets (never committed); document required variables
- **Reverse-proxy** notes (path prefix, TLS, upstream to `127.0.0.1:<port>`) for when you move to a public hostname
- **`README.md`**: how to run, upgrade upstream, rotate credentials

That gives **clean upgrades**, **separation** from this UI repo, and an **easier** later move to a public URL (change proxy + rebuild or reconfigure the app’s MCP base URL).

**This app’s wiring:** set **`VITE_WORKSPACE_MCP_URL`** to the base URL the **browser** can reach (e.g. `https://mcp.internal.example.com` behind the proxy, or `http://127.0.0.1:8787` for local dev). Values are **build-time** in Vite — set them in the environment used for `npm run build` (or dev server) for each deployment target.

**Phase 1 order of operations (deploy → QA → UX):** **[docs/workspace-mcp-phase1-checklist.md](docs/workspace-mcp-phase1-checklist.md)**.  
**Example — `mcp.gatewayglobal.ai` + path `/googleworkspace/`:** nginx, Certbot, systemd, paths under `/opt/gatewayglobal/…` — **[docs/workspace-mcp-nginx-deploy.md](docs/workspace-mcp-nginx-deploy.md)**.

## Legal pages — source of truth vs app rendering

**Canonical policy text** (Privacy Policy and Terms of Service) lives in **`governing_docs/legal/`**, not as authoritative copy inside app repos:

| ID | Document | Canonical file |
|----|----------|------------------|
| **LEGAL-001** | Privacy Policy | [`governing_docs/legal/LEGAL-001-Privacy-Policy.md`](governing_docs/legal/LEGAL-001-Privacy-Policy.md) |
| **LEGAL-002** | Terms of Service | [`governing_docs/legal/LEGAL-002-Terms-of-Service.md`](governing_docs/legal/LEGAL-002-Terms-of-Service.md) |

**Registry and workflow** (draft → review → counsel → ratify → mirror to app): **[`governing_docs/legal/README.md`](governing_docs/legal/README.md)**.

**App repo(s)** own routes and presentation only — e.g. Gateway web client: `PrivacyPolicy.tsx`, `TermsOfService.tsx`, `App.tsx` routes. **Mirror** approved text from the governed files; keep versions in sync. Placeholder or interim copy in the app is **provisional** until **`approved_for_publication`** (or equivalent) in front matter and an explicit sync.

These documents are public promises, compliance inputs, and OAuth verification inputs; follow the same governance discipline as other controlled artifacts.

## Google OAuth consent screen — Privacy & Terms URLs

Google Cloud **OAuth consent screen** (and similar forms) often require **Application home page**, **Privacy Policy**, and **Terms of Service** URLs. When the production site behind **gatewayglobal.ai** serves those routes:

| Page | Path | Canonical URL |
|------|------|-----------------|
| Privacy Policy | `/privacy` | `https://gatewayglobal.ai/privacy` |
| Terms of Service | `/terms` | `https://gatewayglobal.ai/terms` |

If you only deploy to a **dev** host first, use the same paths on that origin, e.g. `https://<dev-host>/privacy` and `https://<dev-host>/terms`.

**Implementation reference:** `aibizbot-dev.gatewayglobal.ai` — `client/src/pages/legal/`, routes in `client/src/App.tsx`. This voice app repo does not ship those pages; use the URLs above in Google Cloud when the Gateway app serves **gatewayglobal.ai**.

**Legal:** Do not treat any deployed page as **compliance-final** until counsel has reviewed the **governed** documents in **`governing_docs/legal/`** and the app reflects that approved revision.

## Pre–Workplace Phase 1 gate

Before calling Workplace integration **live** or **production-ready**, satisfy **[docs/pre-workplace-checklist.md](docs/pre-workplace-checklist.md)** (secret boundary, structured intent routing, no MCP bypasses).

## Phase 1 calendar read — QA

Manual QA for the first governed read path: **[docs/workspace-calendar-read-qa.md](docs/workspace-calendar-read-qa.md)**.

## Phase 1 Gmail read / search — slice spec & QA

Intent-level spec and test checklist (same architecture as calendar): **[docs/workspace-gmail-read-search-slice.md](docs/workspace-gmail-read-search-slice.md)**, **[docs/workspace-gmail-read-qa.md](docs/workspace-gmail-read-qa.md)**.

## Local and sovereign runtime lanes — Workspace Domain Pack v1

**AIOS-SPEC-007** covers **retrieval and execution** via MCP (Gmail search, message read, thread content, drafts). **Interpretation** of retrieved text **SHALL** use the **Local Interpretation Lane** by default (**AIOS-SPEC-009 §16**). **Sovereign voice** (speech-input and speech-output) **SHALL** follow **AIOS-SPEC-009 §17** when the product claims local-first voice.

**Normative runtime standards**

| Lane | Standard |
|------|----------|
| Interpretation (local LLM) | **[`OLLAMA_RUNTIME_STANDARD.md`](governing_docs/operations/OLLAMA_RUNTIME_STANDARD.md)** |
| Speech-input (STT) | **[`WHISPER_RUNTIME_STANDARD.md`](governing_docs/operations/WHISPER_RUNTIME_STANDARD.md)** |
| Speech-output (TTS) | **[`LOCAL_TTS_RUNTIME_STANDARD.md`](governing_docs/operations/LOCAL_TTS_RUNTIME_STANDARD.md)** |

**Canonical registry IDs (AMD-2026-008):** **AIOS-OPS-001** = Ollama standard, **AIOS-OPS-002** = Whisper STT standard, **AIOS-OPS-003** = local TTS standard (each file’s YAML lists `registry_id`).

### Capability registry (informative — align code with this table)

| `id` | `domain` | `plane` | `lane` | `runtime` | `fallbackPolicy` | Disclosure |
|------|------------|---------|--------|-----------|------------------|------------|
| `local.stt.transcribe` | `shell.voice`, `session` | `read` (input) | `local` | `whisper` / `faster-whisper` | `proposal` or `block` if remote disallowed | **SHALL** show STT readiness when §17 sovereign voice is active; **WHISPER_RUNTIME_STANDARD** |
| `local.tts.speak` | `shell.voice`, `session` | `read` (output) | `local` | `local_tts` (engine-specific) | same | **SHALL** show TTS readiness; **LOCAL_TTS_RUNTIME_STANDARD** |
| `local.llm.summarize` | `workspace.mail`, `workspace.calendar` | `read` | `local` | `ollama` | `proposal_required` or `block` if remote disallowed | Shell + operator; **OLLAMA_RUNTIME_STANDARD**. **Output:** `ThreadSummaryV1` + `summarySchema: "thread_summary_v1"`; `interpretation_invalid` on parse failure. |
| `local.llm.classify` | `workspace.mail` | `read` | `local` | `ollama` | same | As above. |
| `local.llm.extract_actions` | `workspace.mail` | `read` | `local` | `ollama` | same | As above. |
| `local.llm.propose_reply` | `workspace.mail` | `read` | `local` | `ollama` | same | Bullets or text for review; **Gmail draft** still MCP + **§15**. |

**`ui.primaryAllowed`:** `true` for interpretation outputs when local LLM readiness is `running_ready`; otherwise disclose **unavailable** per **OLLAMA_RUNTIME_STANDARD §5–6**. Same pattern for STT/TTS when wired (**§17**).

**Remote (cloud STT/TTS/Gemini):** only per **AIOS-SPEC-009 §16.4** and **§17.4** — explicit user choice, policy, or documented escalation — **never** silent substitution for sovereign / local-first lanes (**POL-LANE-VOICE-001**, **POL-MODEL-002**–**004**).

## Related documents

- **Privacy / Terms:** governed source — **[`governing_docs/legal/`](governing_docs/legal/)** (`LEGAL-001`, `LEGAL-002`); public URLs — § *Legal pages* / *Google OAuth consent screen* above.
- **Intent lifecycle / discovery / onboarding:** [`AIOS-SPEC-008`](governing_docs/specifications/IntentDiscoveryOnboardingFramework.md) — frames how Workspace-dependent intents evolve (dependency mapping, onboarding states, promotion path); extends [`AIOS-SPEC-007`](governing_docs/specifications/GoogleWorkspaceIntegrationGovernance.md) per the spec appendix.
- **Intent primitive (core execution object):** [`AIOS-SPEC-009`](governing_docs/specifications/IntentPrimitiveAndExecutionModel.md) — schema, lifecycle, UI contract, governance chain, **§16 local interpretation lane**; align with [`AMD-2026-007`](governing_docs/amendments/AMD-2026-007.md) for shell/policy scaffolding.
- **Local Ollama runtime (operations):** [`OLLAMA_RUNTIME_STANDARD`](governing_docs/operations/OLLAMA_RUNTIME_STANDARD.md) — readiness, fallback, disclosure (**POL-MODEL-001**–**004**).
- **Sovereign voice (operations):** [`WHISPER_RUNTIME_STANDARD`](governing_docs/operations/WHISPER_RUNTIME_STANDARD.md), [`LOCAL_TTS_RUNTIME_STANDARD`](governing_docs/operations/LOCAL_TTS_RUNTIME_STANDARD.md) — **AIOS-SPEC-009 §17**.
- **Amendment (sovereign voice lanes):** [`AMD-2026-008`](governing_docs/amendments/AMD-2026-008.md).
- **Pre-ratification conformance:** [`AIOS-SPEC-009-CONFORMANCE-TEST-V1`](governing_docs/specifications/AIOS-SPEC-009-CONFORMANCE-TEST-V1.md) — manual + P0/P1/P2 scorecard before SPEC-009 ratification.
- Amendment (Workspace plane): `governing_docs/amendments/AMD-2026-006.md`
- AIP workspace intents: `AIOS-SPEC-003` §11
- UI surfaces: `AIOS-SPEC-006` §13
