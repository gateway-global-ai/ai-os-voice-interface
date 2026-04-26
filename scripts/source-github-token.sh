#!/usr/bin/env bash
# Export GITHUB_TOKEN and GH_TOKEN from the repo's `.env.local` for `git` (via `gh` credential helper) and `gh` CLI.
# See: https://cli.github.com/manual/gh_help_environment
#
# Usage (must be sourced; running as ./script does not persist exports in your shell):
#   source ./scripts/source-github-token.sh
#   cd /path/to/ai-os-voice-interface && source ./scripts/source-github-token.sh
#
set -euo pipefail
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
REPO_ROOT="$(cd "$_SCRIPT_DIR/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "source-github-token: .env.local not found at $ENV_FILE" >&2
  return 1 2>/dev/null || exit 1
fi
# First line that looks like GITHUB_TOKEN= (no comments)
_line="$(grep -E '^[[:space:]]*GITHUB_TOKEN=' "$ENV_FILE" | head -1 || true)"
if [[ -z "$_line" ]]; then
  echo "source-github-token: GITHUB_TOKEN= is missing in .env.local" >&2
  return 1 2>/dev/null || exit 1
fi
# Strip name and optional double-quotes/CR
_val="${_line#*GITHUB_TOKEN=}"
_val="${_val#\"}"
_val="${_val%\"}"
_val="${_val%$'\r'}"
export GITHUB_TOKEN="$_val"
export GH_TOKEN="$_val"
unset _line _val
