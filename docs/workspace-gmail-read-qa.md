# QA checklist — Phase 1 Workspace Gmail read / search

This document verifies **operational correctness** of the Gmail read-plane slice and supports **[pre-workplace-checklist.md](./pre-workplace-checklist.md)** (especially **Track C** — no MCP bypass). Use it once **`workspace_mail_hub`** (or equivalent) is implemented per **[workspace-gmail-read-search-slice.md](./workspace-gmail-read-search-slice.md)**.

**Intents under test:** `workspace.mail.search`, `workspace.mail.read`

## Usage

Execute and record this checklist for any PR that:

- implements or modifies Gmail/Mail MCP read-plane behavior, or
- changes the adapter, integration control plane, mail payload path, or `WorkspaceHubSurface` mail mode.

Results **should** be included in the PR description using the template in **§7**.

## Flow under test

```
workspace_mail_hub
  → runWorkspaceControlPlane
  → callWorkspaceMcpAdapter
  → MCP tools/call (params.name = workspace.mail.search | workspace.mail.read)
  → GovernanceWorkspaceMailHubPayload (planned)
  → WorkspaceHubSurface (mode: mail)
```

---

## 1. Preconditions

| Check | Notes |
|-------|--------|
| **Branch** | Feature branch touching Workspace mail |
| **Build** | `npm run build` exits **0** |
| **Workspace MCP server** | Reachable for happy-path tests, or unavailable for failure tests |
| **Env** | `VITE_WORKSPACE_MCP_URL`; optional `VITE_WORKSPACE_MCP_JSONRPC_PATH`, `VITE_WORKSPACE_MCP_TIMEOUT_MS` |

---

## 2. Acceptance criteria summary

The slice **passes** when all of the following are true:

- [ ] No direct MCP calls from UI components — execution goes **control plane → adapter** only.
- [ ] UI shows explicit states: **`not_configured`**, **`error`**, **`empty`**, **`ok`** (see §4).
- [ ] Adapter failure codes preserved (`adapterCode` where applicable).
- [ ] Policy denial happens **before** network when exercised (see TC-09).
- [ ] Audit events for success and failure (`workspace_control_plane` / `logWorkspaceAudit`).
- [ ] No silent fallback to generic chat or fake success.
- [ ] **`npm run build`** stays green.

---

## 3. Test cases

### TC-01 — Build integrity

| Step | Command / action |
|------|------------------|
| 1 | `npm run build` |

| Pass | Fail |
|------|------|
| Exit code **0** | Any build error |

---

### TC-02 — Missing MCP configuration

| Setup | Unset `VITE_WORKSPACE_MCP_URL` (restart dev server). |
|-------|------------------------------------------------------|
| Steps | Open the governed **Gmail / Mail** surface (loads `workspace_mail_hub` and search path). |

| Expected control plane | `adapter.ok === false`, `adapterCode === "not_configured"`. |
| Expected UI | **Not configured** panel; not a fake inbox. |
| Expected audit | Failure path consistent with not_configured. |

---

### TC-03 — Happy path / mail search

| Setup | Valid MCP URL; server accepts `tools/call` for **`workspace.mail.search`**; auth as required. |
|-------|----------------------------------------|
| Steps | Open mail hub; search runs per slice design (e.g. on load). |

| Expected adapter request | `POST` JSON-RPC `tools/call`; **`params.name` = `workspace.mail.search`**; tool **`args`** include **`query: string`** (may be empty). Search text MUST NOT be carried only via `resource_ref` (see [slice spec](./workspace-gmail-read-search-slice.md) — search input contract). |
| Expected control plane | `ok: true`; parsed `data`; success audit with adapter success. |
| Expected UI | `loadState === "ok"` (or product-specific sub-state); real data or structured preview. |

---

### TC-04 — Happy path / mail read (when implemented)

| Setup | Valid MCP; server accepts **`workspace.mail.read`**; valid message id (or ref). |
|-------|----------------------------------------|
| Steps | Select a message or trigger read with `resource_ref` per envelope rules. |

| Expected adapter request | **`params.name` = `workspace.mail.read`**. |
| Expected UI | Message body/metadata shown; not conflated with search error states. |

---

### TC-05 — Unreachable MCP host

| Setup | MCP URL invalid or server stopped. |
|-------|-------------------------------------|
| Steps | Open mail hub. |

| Expected | `adapterCode === "http_error"` (or equivalent); **Error** UI; no blank success. |

---

### TC-06 — Timeout

| Setup | `VITE_WORKSPACE_MCP_TIMEOUT_MS=500` and delayed MCP. |
|-------|------------------------------------------------------|
| Steps | Trigger search. |

| Expected | `adapterCode === "timeout"`; loading does not spin forever; audited failure. |

---

### TC-07 — Auth failure

| Setup | MCP returns **401** or **403**. |
|-------|----------------------------------|
| Steps | Open mail hub. |

| Expected | `adapterCode === "auth_error"`; user-visible distinction from empty inbox. |

---

### TC-08 — Malformed MCP response

| Setup | Invalid JSON or unusable `result` shape. |
|-------|-------------------------------------------|
| Steps | Trigger search/read. |

| Expected | Safe **Error** state; no crash; no fake messages. |

---

### TC-09 — Empty but valid search result

| Setup | MCP returns **valid** response with **zero** messages (per `workspaceMailDataIsEmpty` heuristic). |
|-------|----------------------------------------|
| Steps | Run search. |

| Expected UI | **Empty** copy only when data is valid and empty; not **Error**. |

---

### TC-10 — Policy denial before network

| Setup | Harness: invalid envelope or scope mismatch (see calendar TC-09). |
|-------|----------------------------------------|

| Expected | `runWorkspaceControlPlane` returns `policy_denied` or `invalid_intent`; **no** MCP request; denial audited. |

---

### TC-11 — No direct MCP bypass

| Steps | Run: |

```bash
rg "callWorkspaceMcpAdapter" src/
rg "VITE_WORKSPACE_MCP_URL" src/
```

| Pass | Fail |
|------|------|
| Adapter only via control plane; overlays do not `fetch` MCP origin | Direct MCP bypass from UI |

---

## 4. Expected UI states (`workspace_mail_hub`)

| State | What the user should see |
|-------|---------------------------|
| **Not configured** | Configure MCP URL; not an empty inbox |
| **Loading** | Loading indicator during payload fetch |
| **Error** | Failure copy for transport/auth/timeout |
| **Empty** | No messages **only** when response is valid and empty |
| **OK** | Search results and/or message content per design |

---

## 5. Expected audit fields

Same discipline as calendar: intent id, scope class (`workspace.google.read`), policy decision, adapter outcome, `adapterCode` on failure, `auditId`.

---

## 6. Final pass criteria

The Gmail read/search slice is **accepted** when TC-01 through TC-11 pass (TC-09/10 may be **N/A** until a harness exists), build is green, no bypass, no silent fallback, UI matches outcomes.

Broader gate: **[pre-workplace-checklist.md](./pre-workplace-checklist.md)**.

---

## 7. Test result template

```markdown
## Workspace Gmail read/search QA

- Branch:
- Commit:
- MCP URL configured: yes/no
- Date: YYYY-MM-DD

| Test case | Result | Notes |
|-----------|--------|-------|
| TC-01 Build | Pass/Fail | |
| TC-02 Not configured | Pass/Fail | |
| TC-03 Search happy path | Pass/Fail | |
| TC-04 Read happy path | Pass/Fail / N/A | |
| TC-05 Unreachable host | Pass/Fail | |
| TC-06 Timeout | Pass/Fail | |
| TC-07 Auth | Pass/Fail | |
| TC-08 Malformed | Pass/Fail | |
| TC-09 Empty | Pass/Fail | |
| TC-10 Policy denial | Pass/Fail / N/A | |
| TC-11 No bypass | Pass/Fail | |

### Overall
Pass / Fail

### Blocking issues
-

### Non-blocking notes
-
```

---

## Related

- [workspace-gmail-read-search-slice.md](./workspace-gmail-read-search-slice.md) — implementation blueprint
- [WORKSPACE.md](../WORKSPACE.md)
- [workspace-calendar-read-qa.md](./workspace-calendar-read-qa.md) — parallel pattern
