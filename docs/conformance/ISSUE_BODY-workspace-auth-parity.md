# [Workspace Auth] Shell says connected while Mail panel reports sign-in required

## Summary

Runtime screenshots show **shell / header** disclosure **“Google Workspace connected”** while the **Mail** governed panel simultaneously shows **“Google sign-in required”** / **no Google access token for Workspace MCP** (yellow alert). **Drive** and **Calendar** can succeed in the same product session.

**This is not** the same defect as **#13** (mail list formatter / `mailResult.data` shape). **#13** stays scoped to bounded unread **render** when the panel already shows **Connected · Google token ready**.

## Hypothesis

**Two sources of truth** for “connected”:

- **Shell / preference / `resolveWorkspaceState`** — e.g. user clicked “Connect Workspace” or saved preference.
- **Panel runtime** — **`getSessionGoogleAccessToken()`** (GIS) and/or **`VITE_WORKSPACE_MCP_*`** bearer actually present when **`runWorkspaceControlPlane`** runs.

**AIOS-SPEC-009** §12: primary disclosure must not misstate **auth** / **adapter** readiness.

## Scope

- Align **header** Workspace line with **actual** GIS token + MCP bearer availability for **lane execution**, or disclose **degraded** / **sign-in required** consistently.
- Token **refresh**, **persistence**, **clear** paths (`GoogleWorkspaceSignInBar`, `integrationControlPlane` auth check ~165).
- **Repro:** same browser session — open **Drive** → **Calendar** → **Mail**; record connected vs sign-in-required per panel.

## Evidence

- Conformance artifact: `docs/conformance/artifacts/workspace-control-plane-call-graph.md` (runtime + UI §8).
- Parent: **#12** pilot.

## Implementation target

- **One authoritative** auth / MCP readiness state, emitted from the **control plane** or a **shared runtime** layer that **`runWorkspaceControlPlane`** and GIS/env token checks already consult (or will consult consistently).
- **Shell** (`ShellIdentityBar` / `resolveWorkspaceState`) and **Workspace panels** (`GoogleWorkspaceSignInBar`, hub surfaces) **read that same state** — not independent “connected” heuristics.
- **No** header/panel **local** “connected” labels that can contradict **execution-time** token availability (GIS session vs preference).
- **Explicit** distinctions (`auth_ready`, `auth_required`, `token_stale`, etc.) **only** when derived from that **single truth source** — aligns with the **aspirational** outcome family in `workspace-control-plane-call-graph.md` §10; **not** normative until spec/amendment if needed.

**Why it unblocks #15:** Disambiguation can ride the **same** control-plane response model instead of panel-only logic.

## Out of scope

- **#13** mail normalization (do not merge fixes without separate PR review).

---

## Implementation record (2026-04-06)

**Status:** Code landed; **issue closes after one live repro** confirms shell and governed panels no longer diverge on auth/readiness.

### Code path (truth source)

- **`src/shell/workspaceState.ts`** — `hasWorkspaceMcpExecutionToken()` (GIS session token or `getWorkspaceMcpBearerTokenFromEnv()`, same family as ICP bearer path) and **`resolveWorkspaceState()`**.
- **Boundary:** `if (!hasWorkspaceMcpExecutionToken()) return 'auth_required'` then `'connected'`. **`connected`** means **executable** (MCP can authenticate), not only “user clicked Connect Workspace.”
- **Consumers:** `App.tsx` (`workspaceDisclosure`), **`loadGovernancePayload.ts`** (same `resolveWorkspaceState()` / `shouldShowWorkspaceHub`), **`spec009PrimaryDisclosure.ts`**, **`shellSurfaceLabels.ts`**, **`ShellIdentityBar.tsx`**, **`WorkspaceHubSurface`** gate via `shouldShowWorkspaceHub(payload.workspaceState)`.

### Tests added

- `src/shell/workspaceState.test.ts` — `shouldShowWorkspaceHub` allows **only** `connected` and `auth_required`.
- `src/compliance/spec009PrimaryDisclosure.test.ts` — `auth_required` forces primary disclosure.

### Contradiction removal (intended path)

The prior failure mode — **shell “connected”** with **panel “sign-in required”** when no execution bearer — should be **impossible by construction**: without GIS + no env bearer, shell state is **`auth_required`**, not **`connected`**, aligned with ICP `auth_required` when adapter is not invoked with a token.

### Live verification (before closing #14)

With **`VITE_WORKSPACE_MCP_URL`** set, user has opted in (**Connect Workspace**), and **no** GIS token and **no** env bearer:

| Surface | Expected |
|--------|----------|
| Shell / identity bar | **`auth_required`** copy (sign-in required), not “Workspace connected” |
| Workspace hub | Renders; sign-in bar path available |
| Mail / Calendar / Drive panels | **`auth_required`** or equivalent from CP where applicable — **not** mixed with shell “connected” |

Optional cleanup (non-blocking): rename **`WorkspaceHubSurface`** prop **`connected`** → e.g. `hubGateOpen` — legacy wording only.
