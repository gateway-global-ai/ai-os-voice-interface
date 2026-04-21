---
name: deploy-vps
description: >-
  Deploys the AI OS voice interface to a Linux app host using scripts/deploy.sh
  (git pull, npm ci, npm run build, optional PM2 restart, smoke check). Use when
  the user asks to deploy to the server or VPS, push dist to production,
  run stage.gatewayglobal.ai / gatewayglobal.ai deploy, PM2 restart after merge,
  or run the deployment script.
---

# Deploy AI OS voice interface (VPS)

## When this applies

- User asks to **deploy**, **ship to production**, **run deploy on the server**, **restart PM2**, or **update the stage site** after merging.
- References **`scripts/deploy.sh`**, **`deploy.env`**, **`DEPLOY_ROOT`**, **`/opt/gatewayglobal/`**.

## What the deploy script does

Canonical script: **`scripts/deploy.sh`** (bash, runs on the **Linux** host — not Windows PowerShell).

1. **`cd` to `DEPLOY_ROOT`** (see below) and verify `.git` exists.
2. **Git:** `fetch` → checkout **`GIT_REF`** (default `main`), including **`origin/<branch>`** when the branch is not local yet → **`git pull --ff-only`**.
3. **`npm ci`** then **`npm run build`** with **`NODE_ENV=production`** by default.
4. **PM2:** If **`PM2_APP`** is set, **`pm2 restart "$PM2_APP" --update-env`** (or `reload`).
5. **Smoke:** **`curl`** to **`http://127.0.0.1:$SMOKE_PORT/api/gemini/readiness`** (skip with **`SKIP_SMOKE=1`**).

**Does not** modify **`.env.local`** — API keys and **`VITE_*`** for production stay on the server.

## Paths and defaults

| Variable | Role |
|----------|------|
| **`DEPLOY_ROOT`** | Repo root on the VPS. If unset, the script uses the parent of **`scripts/`** (the clone containing `scripts/deploy.sh`). Example: **`/opt/gatewayglobal/stage.gatewayglobal.ai`**. |
| **`GIT_REF`** | Branch or tag (default **`main`**). |
| **`REMOTE`** | Git remote (default **`origin`**). |
| **`PM2_APP`** | PM2 process name, e.g. **`stage.gatewayglobal.ai`**. Empty = skip PM2. |
| **`SMOKE_PORT`** | Port for post-deploy curl (default **`5173`**). Set to the port **`npm start`** / **`prodHost`** actually listens on (e.g. **`4173`** if that is what nginx proxies to). |
| **`SKIP_GIT`** | **`1`** = skip git, only **`npm ci`** + build (useful for server-side build tests). |
| **`SKIP_SMOKE`** | **`1`** = skip curl. |

Example env file in repo: **`scripts/deploy.env.example`** (copy ideas to the server; do not commit secrets).

## How to run

**On the VPS** (recommended):

```bash
export DEPLOY_ROOT=/opt/gatewayglobal/stage.gatewayglobal.ai
export GIT_REF=main
export PM2_APP=stage.gatewayglobal.ai
export SMOKE_PORT=4173   # adjust to match PORT in PM2 / .env
bash "$DEPLOY_ROOT/scripts/deploy.sh"
```

**From project root** (same machine as the clone):

```bash
bash scripts/deploy.sh
```

**npm wrapper** (requires **Git Bash** or **WSL** on Windows; on plain PowerShell without bash, use the VPS command above):

```bash
npm run deploy:vps
```

## What the agent should do

1. Prefer **running or quoting** **`scripts/deploy.sh`** on the **app host** over inventing ad-hoc rsync steps unless the user asks otherwise.
2. Remind that **production** is **`tsx server/prodHost.ts`** via **`npm start`** after **`vite build`** — **`dist/`** is gitignored; the server builds on the host (or CI copies artifacts — if the user uses CI, follow their pipeline).
3. After deploy, optionally suggest verifying **`/api/gemini/readiness`** and the public URL the user cares about (**gatewayglobal.ai** etc.).

## Do not

- Put secrets into the skill or into **`scripts/deploy.env.example`** — only **`GEMINI_API_KEY`**, **`VITE_OTP_PROXY_TARGET`**, and related keys belong in **`.env.local`** on the server (see **`.env.example`**).
