# Interim shell authority (operator / admin)

This note describes how **developer** and **operator** shell surfaces are gated **today** in the AI OS voice interface runtime. It is **not** a full identity, SSO, or RBAC model—only **device-local, interim** signals used until a real authority layer exists.

## Defaults and intent

- **Primary** shell mode is the default and remains broadly available.
- **Operator** (diagnostics chrome) and **developer** shell modes are **intentionally restricted**; the app will refuse transitions into them without an allowed signal (users see a short denial message—this is not silent failure).
- These mechanisms are for **testing, support, and trusted deployments**, not an end-user security guarantee. Anyone who can set URL parameters or browser storage on a machine can satisfy the interim checks on that machine.

## Supported unlock vectors (current runtime)

Authority is evaluated in `src/shell/shellAuthority.ts` (`readInterimShellAuthority`). Supported sources include:

| Mechanism | Purpose |
|-----------|---------|
| **URL query** | `?aios_operator=1` — operator eligibility; `?aios_dev=1` — developer eligibility (and contributes to bootstrap hints). |
| **Legacy storage** (session or local) | `aios.shell.operator`, `aios.shell.diagnostics` — compatibility with existing POL-SHELL-006-style hints (`shellChromeVisibility`). |
| **Interim unlock keys** (session or local, value `1`) | `aios.shell.interim.operator_unlock`, `aios.shell.interim.developer_unlock` — explicit operator/admin unlock (e.g. devtools or controlled tooling). |
| **Build-time flag** | `VITE_AIOS_SHELL_INTERIM_ALLOW=true` — grants both eligibilities when set at build time; use only for **trusted builds** or local dev, not as a substitute for real policy. |

Operator-level allowance implies developer surface entry is allowed (see code). Exiting to **primary** is always permitted.

## Product note: no dedicated surface toggles in chrome

The **primary** shell deliberately does **not** add menu or footer buttons for operator/developer surface mode. Interim authority is not end-user identity; visible toggles would add clutter for most sessions and would often surface denial copy. **Entry** to elevated surfaces remains: spoken or typed deterministic shell commands, agent `app.shell.*` (`INTENT_JSON`), and operator/admin unlock mechanisms in the table above (URL, storage, build flag). Voice ↔ chat in the footer uses the same `shellNavigationApply` path as those intents but does not change surface mode.

## Where to look in code

- Policy: `src/shell/shellAuthority.ts`
- Bootstrap clamp (persisted/URL modes vs authority): `src/shell/shellBootstrap.ts`
- Apply path (shared by deterministic input, agent shell intents, footer voice/chat): `src/shell/shellNavigationApply.ts`
- Enforcement at UI: `src/App.tsx` (wires `tryApplyShellNavigationAction` / `applyShellNavigationAction`)

For future work, replace the **internals** of `readInterimShellAuthority` when a proper capability or identity layer is available—call sites should remain stable.
