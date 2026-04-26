---
name: 123checkme-rust-saas-integration
description: Integrates 123CheckMe (identity, OTP, optional SaaS subscription webhooks) with the Rust `skills` CLI, AI OS `checkmeClient` / Supabase, and customer verification flows. Use when wiring vibe-coder SaaS apps, verification, or a Rust-managed skill for CheckMe + DB logic.
---

# 123CheckMe + Rust skills + AI OS

## API docs and skills (primary)

- Cursor skills: https://cursor.sh/docs/skills
- Rust `skills` crate: https://crates.io/crates/skills
- Rust `skills` docs: https://docs.rs/skills/latest/skills/
- Cursor MCP (remote `url`, `headers`, OAuth): https://cursor.com/docs/context/mcp
- Build MCP server: https://modelcontextprotocol.io/docs/develop/build-server
- For deployment protocol, also follow `.cursor/skills/rust-native-skills-manager/SKILL.md`

## Hosted MCP + Cursor (no separate “download the app” gate)

End users complete **123CheckMe SaaS** signup and operator flows in the **browser** on **https://123checkme.com/** (and related hosts). **Cursor** agents consume the **same** CheckMe product through a **remote MCP** entry in **`.cursor/mcp.json`**: `url` pointing at the **Streamable HTTP / JSON-RPC** MCP endpoint issued from the SaaS or operator dashboard, plus either **OAuth** (Connect in Cursor) or **`Authorization: Bearer ${env:CHECKME_MCP_TOKEN}`** per [Cursor MCP docs](https://cursor.com/docs/context/mcp).

**Repo wiring:** copy **`.cursor/mcp.example.json`** → **`.cursor/mcp.json`**, or run **`CHECKME_MCP_URL=… npm run cursor:mcp:123checkme`** (see **`.cursor/MCP_SETUP.md`** §4.05). When publishing through **skillshub** / Rust **`skills`**, add **`allowed-tools`** in this skill’s YAML with the **actual** tool names from the hosted MCP’s **`tools/list`** response once verified.

### Verified reachability note (no-mock)

As of **2026-04-26**, **`https://www.123checkme.com/mcp`** serves the SPA (`GET` → `text/html`); **`POST /mcp`** returns **`Cannot POST /mcp`**. So the **marketing site path `/mcp` is not an MCP listener** until nginx/your Node stack mounts the MCP transport there or you use another dashboard-issued base URL. Do not claim “MCP deployed on root `/mcp`” without a successful **`initialize`** POST and **`tools/list`**.

## Product context (source of truth: your deployment + repo code)

**123CheckMe** is a platform you operate: public surface describes **identity verification** (multi-channel: OTP, magic link, ID upload, digital signatures) and a **SaaS framework** (universal webhooks, normalized subscription / access checks). The live marketing site is **https://www.123checkme.com/** — treat product behavior as defined by your **server implementation and published API docs**, not by marketing copy alone.

**This repository** (AI OS) integrates **phone OTP** to Supabase and optional verification entry URLs; it does **not** contain the full 123CheckMe app server. Canonical touchpoints here:

| Concern | Location |
|--------|----------|
| Browser / API key calls to 123CheckMe (send/verify) | `src/core/io/checkmeClient.ts` |
| Returning-user verification entry URL | `src/config/identityVerification.ts` |
| Dev/prod OTP proxy to your host | `server/otpProxyForward.ts`, `vite.config.ts` |
| Env contract (MCP- and CheckMe-related) | `WORKSPACE.md` |
| **Cursor MCP merge (operators)** | `scripts/ensure-cursor-123checkme-mcp.sh`, `.cursor/mcp.example.json`, `.cursor/MCP_SETUP.md` §4.05 |
| **Identity verification MCP (Gateway org)** | https://github.com/gateway-global-ai/identity-verification-mcp-gateway-gobal-ai — **private** `gateway-global-ai` repository (slug uses `gobal` spelling), `main` default branch; MCP server and contracts for 123CheckMe / identity flows. Pair with this app’s `VITE_CHECKME_VERIFICATION_ENTRY_URL` and `src/config/identityVerification.ts`. Also in `WORKSPACE.md`. A browser or unauthenticated `curl` to the HTML URL can return 404/redirect; use GitHub with access or the API with a valid token. |

When the **123CheckMe application server** (non-MCP) lives in another GitHub repo, add that URL alongside the MCP link in task notes; do not invent paths.

## What “Rust for logic” should mean (recommended shape)

1. **Cursor / agent skill (this `SKILL.md`)**  
   - Encodes: which env vars exist, which files to edit, no-mock requirements, and when to call 123CheckMe vs Supabase.

2. **Rust `skills` package** (same `skills` CLI you already use)  
   - Copy or symlink this skill directory into your **`skills` sources** tree, then run **`skills validate`** → **`skills render`** / **`skills push`** per [Rust `skills` docs](https://docs.rs/skills/latest/skills/). The skill folder’s **`SKILL.md`** should list real verification steps, idempotent validation, and **`allowed-tools`** populated from the **hosted** MCP’s **`tools/list`** once available (see [skillshub](https://crates.io/crates/skillshub) / `.cursor/rules/skillshub-authority-gate.mdc` when shell authority applies).

3. **Optional: Rust service or MCP (separate from this Vite app)**  
   - Use when you need **server-side** secrets, webhook signature verification, or long-running jobs (Stripe → normalized access state → Supabase). The browser must **not** hold service role keys; Rust or Edge Functions can hold them.

## Supabase and env

- Browser uses **publishable/anon** keys; RLS must protect rows. **Never** put service role keys in the client or in committed skills.  
- If you store verification or subscription state in Supabase, schema and policies must be reviewed; align with your existing AI OS + VCU patterns.

## No-mock gate

- Do not fabricate 123CheckMe API responses, webhook bodies, or Supabase row states.  
- If an integration is not run against a real 123CheckMe environment or a verified test account, mark work **`blocked` or `unverified`** and record the real command, exit code, or error string.  
- Cited primary docs: https://cursor.sh/docs/skills, https://crates.io/crates/skills

## May change

- This skill’s workflow notes, `allowed-tools` hints, and second repo link for the 123CheckMe app server (if different from the identity MCP repo above).

## May not change

- Do not store API keys, Twilio/Supabase service credentials, or private 123CheckMe host secrets in skill text or in `allowed-tools` in a way that would leak them to untrusted clients.

## Verifiable output

Return: file paths changed, 123CheckMe/Supabase surfaces touched, `skills validate` (or `blocked`) result, and any items left **`unverified`**.
