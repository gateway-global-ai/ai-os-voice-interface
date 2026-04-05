# Phase 1 — Workspace MCP deployment & proof order

Use this sequence so **Workplace read-plane** is proven end to end before UX polish.

---

## 1. Deploy `aios_google_workspace_mcp` (gating)

**Why first:** Calendar and Gmail surfaces are already wired in this app; QA without a live MCP mostly exercises failure paths. Deployment is the gate for a real control-plane → adapter → audit loop.

**Target:**

| Item | Goal |
|------|------|
| Host | Same server as your stack (e.g. `72.61.4.44`) |
| Listen | **`127.0.0.1:<port>`** (e.g. **8000**) — not public on that port |
| JSON-RPC | **`POST`** to `{public base}{path}` with `tools/call` — typically **`/mcp`** on the upstream after nginx strips your path prefix |
| Public URL | **`https://mcp.gatewayglobal.ai/googleworkspace`** (example) with **`WORKSPACE_EXTERNAL_URL`** matching it for OAuth |
| This app | Build with **`VITE_WORKSPACE_MCP_URL`** = that public base (no trailing slash); default **`VITE_WORKSPACE_MCP_JSONRPC_PATH=/mcp`** → effective endpoint `…/googleworkspace/mcp` |

**Detailed steps (paths, nginx, Certbot, systemd):** **[workspace-mcp-nginx-deploy.md](./workspace-mcp-nginx-deploy.md)**  
**Fork / source:** **[gateway-global-ai/aios_google_workspace_mcp](https://github.com/gateway-global-ai/aios_google_workspace_mcp)**  
**Runtime contract:** **[WORKSPACE.md](../WORKSPACE.md)**

**Smoke checks (before QA):** see **[workspace-mcp-nginx-deploy.md](./workspace-mcp-nginx-deploy.md)** § *Post-deploy verification* (success matrix), § *Failure interpretation*, and § *Golden test (`curl`)* — protocol-level validation, not superficial health checks.

- [ ] **`workspace-mcp.service`** (or your unit) is **active**
- [ ] **GET** public `…/mcp` → **not 502**; plain **`curl`** may return **406** (expected without streamable **`Accept`**)
- [ ] **POST** `…/mcp` with **`Accept: application/json, text/event-stream`** + JSON-RPC **`initialize`** → **200** SSE (and same against **`127.0.0.1:<port>/mcp`**)
- [ ] **`tools/list`** (with **`Mcp-Session-Id`** from **`initialize`** if required) → **200** and tools listed (e.g. `search_gmail_messages`, …)
- [ ] Google OAuth client includes redirect URI(s) the server advertises under your public base
- [ ] Production build (or dev) has **`VITE_WORKSPACE_MCP_URL`** set and dev server restarted

---

## 2. Manual QA against the real MCP

Run **after** §1 is green.

| Doc | What it proves |
|-----|----------------|
| **[workspace-calendar-read-qa.md](./workspace-calendar-read-qa.md)** | Calendar read slice, adapter codes, audits |
| **[workspace-gmail-read-qa.md](./workspace-gmail-read-qa.md)** | Mail search + read, empty query, auth, timeout/error |

**You learn:** empty-query search behavior, OAuth correctness, truthful **not_configured** / **error** / **empty** / **ok**, and whether the slice is **merge-ready**. Record results in each doc’s §7 template — for Gmail, fill **Behavioral notes** and **`VITE_WORKSPACE_MCP_URL`** so §7 supports a **go/no-go** (merge / live-enough / fix-first) judgment, not just pass/fail ticks.

**Broader gate (optional for merge narrative):** **[pre-workplace-checklist.md](./pre-workplace-checklist.md)**

---

## 3. Small UX PR: click search result → `workspace.mail.read`

**Only after** §2 passes. Architecture is already in place; this removes “paste message id” friction without changing the control-plane model.

---

## 4. Overlay / layout system

Separate shell/UI track — important, but **not** blocking Workplace Phase 1 proof.

---

## Related

- [WORKSPACE.md](../WORKSPACE.md) — adapter, env vars, fork pointer
- [workspace-gmail-read-search-slice.md](./workspace-gmail-read-search-slice.md) — mail intent contract
