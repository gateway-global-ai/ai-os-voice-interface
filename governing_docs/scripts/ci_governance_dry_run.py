#!/usr/bin/env python3
"""
Run `automated_review_pipeline.py --dry-run` for each changed governing document in a git range.

Designed for PR CI: exit 0 only if every dry-run reports ready_for_full_run (see dry_run_report.json).

Usage (repo root = governing_docs):
  py -3 scripts/ci_governance_dry_run.py
  py -3 scripts/ci_governance_dry_run.py --base origin/main --head HEAD

Monorepo (repo root contains governing_docs/):
  py -3 governing_docs/scripts/ci_governance_dry_run.py --repo-prefix governing_docs --base origin/main
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
BASE = SCRIPTS.parent


def _find_git_root(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(8):
        if (cur / ".git").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


def _strip_repo_prefix(path: str, prefix: str) -> str:
    path = path.replace("\\", "/")
    if not prefix:
        return path
    p = prefix.strip("/").replace("\\", "/")
    if path == p or path.startswith(p + "/"):
        return path[len(p) :].lstrip("/")
    return path


def _should_dry_run(rel_path: str) -> bool:
    p = rel_path.replace("\\", "/")
    if not p.endswith(".md"):
        return False
    if p.startswith("reviews/") or "/reviews/" in p:
        return False
    if p.startswith("prompts/") or "/prompts/" in p:
        return False
    if p.endswith("/README.md") or p == "README.md":
        return False
    if "automated_runs/" in p:
        return False
    return True


def _git_changed_files(base: str, head: str, cwd: Path) -> list[str]:
    r = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...{head}"],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr or r.stdout or f"git diff failed with {r.returncode}")
    return [ln.strip() for ln in r.stdout.splitlines() if ln.strip()]


def main() -> int:
    ap = argparse.ArgumentParser(description="CI: dry-run pipeline for changed governing docs")
    ap.add_argument("--base", default=os.getenv("GOV_GIT_BASE", "origin/main"), help="Git base ref")
    ap.add_argument("--head", default=os.getenv("GOV_GIT_HEAD", "HEAD"), help="Git head ref")
    ap.add_argument(
        "--repo-prefix",
        default=os.getenv("GOV_REPO_PREFIX", ""),
        help="Strip this prefix from paths (e.g. governing_docs in a monorepo)",
    )
    ap.add_argument(
        "--repo-root",
        default="",
        help="Git repo root (default: auto-detect from governing_docs tree)",
    )
    ap.add_argument(
        "--smart-context",
        action="store_true",
        help="Pass --smart-context to each dry-run",
    )
    args = ap.parse_args()

    git_cwd = Path(args.repo_root).resolve() if args.repo_root else _find_git_root(BASE)

    try:
        names = _git_changed_files(args.base, args.head, git_cwd)
    except RuntimeError as e:
        print(e, file=sys.stderr)
        return 1

    candidates: list[str] = []
    for raw in names:
        rel = _strip_repo_prefix(raw, args.repo_prefix)
        if not _should_dry_run(rel):
            continue
        full = BASE / rel
        if full.is_file():
            candidates.append(rel)

    if not candidates:
        print("No changed governing documents in range; skipping dry-run.")
        return 0

    pipeline = SCRIPTS / "automated_review_pipeline.py"
    if not pipeline.is_file():
        print(f"Missing {pipeline}", file=sys.stderr)
        return 1

    rc = 0
    for doc in sorted(set(candidates)):
        print(f"\n--- CI dry-run: {doc} ---\n")
        cmd = [
            sys.executable,
            str(pipeline),
            "--document",
            doc,
            "--dry-run",
        ]
        if args.smart_context:
            cmd.append("--smart-context")
        r = subprocess.run(cmd, cwd=str(SCRIPTS))
        if r.returncode != 0:
            rc = r.returncode
    return rc


if __name__ == "__main__":
    sys.exit(main())
