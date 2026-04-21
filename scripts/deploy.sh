#!/usr/bin/env bash
# Deploy ai-os-voice-interface on the app host (Linux).
#
# Prerequisites: Node 20+ (or matching your lockfile), npm, git clone at DEPLOY_ROOT,
# secrets in `.env.local` (not overwritten by this script), PM2 if you use PM2_APP.
#
# Usage (on the VPS, from anywhere):
#   bash /opt/gatewayglobal/stage.gatewayglobal.ai/scripts/deploy.sh
# Or after `cd` to the repo:
#   bash scripts/deploy.sh
#
# Environment (optional):
#   DEPLOY_ROOT   — repo root on disk (default: /opt/gatewayglobal/stage.gatewayglobal.ai)
#   GIT_REF       — branch or tag to sync (default: main)
#   REMOTE        — git remote name (default: origin)
#   PM2_APP       — PM2 process name to restart (default: empty = skip PM2)
#   SKIP_GIT      — set to 1 to skip fetch/checkout/pull (build only)
#   NODE_ENV      — passed to build/start conventions (default: production)
#   SMOKE_PORT    — HTTP port for optional local curl after deploy (default: 5173)
#   SKIP_SMOKE    — set to 1 to skip curl check
#
# Example:
#   export DEPLOY_ROOT=/opt/gatewayglobal/stage.gatewayglobal.ai
#   export GIT_REF=main
#   export PM2_APP=stage.gatewayglobal.ai
#   export SMOKE_PORT=4173
#   bash scripts/deploy.sh
#
# @license SPDX-License-Identifier: Apache-2.0

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DEPLOY_ROOT="${DEPLOY_ROOT:-$DEFAULT_ROOT}"
GIT_REF="${GIT_REF:-main}"
REMOTE="${REMOTE:-origin}"
NODE_ENV="${NODE_ENV:-production}"
SMOKE_PORT="${SMOKE_PORT:-5173}"
export NODE_ENV

cd "$DEPLOY_ROOT"

if [[ ! -d .git ]]; then
  echo "deploy: error — not a git repository: $DEPLOY_ROOT" >&2
  exit 1
fi

echo "deploy: root=$DEPLOY_ROOT ref=$GIT_REF node=$(node -v 2>/dev/null || echo '?') npm=$(npm -v 2>/dev/null || echo '?')"

if [[ "${SKIP_GIT:-0}" != "1" ]]; then
  git fetch "$REMOTE"
  if git show-ref --verify --quiet "refs/heads/${GIT_REF}"; then
    git checkout "$GIT_REF"
  elif git show-ref --verify --quiet "refs/remotes/${REMOTE}/${GIT_REF}"; then
    git checkout -B "$GIT_REF" "${REMOTE}/${GIT_REF}"
  else
    echo "deploy: error — branch not found: ${GIT_REF} on ${REMOTE}" >&2
    exit 1
  fi
  git pull --ff-only "$REMOTE" "$GIT_REF"
else
  echo "deploy: SKIP_GIT=1 — using current tree"
fi

npm ci
npm run build

if [[ -n "${PM2_APP:-}" ]]; then
  if command -v pm2 >/dev/null 2>&1; then
    pm2 restart "$PM2_APP" --update-env || pm2 reload "$PM2_APP" --update-env
    echo "deploy: pm2 restarted $PM2_APP"
  else
    echo "deploy: warning — PM2_APP set but pm2 not in PATH" >&2
  fi
else
  echo "deploy: PM2_APP unset — not restarting any process (set PM2_APP or restart manually)"
fi

if [[ "${SKIP_SMOKE:-0}" != "1" ]]; then
  code="$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:${SMOKE_PORT}/api/gemini/readiness" || echo "000")"
  echo "deploy: smoke GET :${SMOKE_PORT}/api/gemini/readiness → HTTP $code"
fi

echo "deploy: done."
