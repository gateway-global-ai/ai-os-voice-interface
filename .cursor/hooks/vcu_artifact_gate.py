#!/usr/bin/env python3
"""Lightweight VCU Cursor artifact gate.

Relevant docs:
- Cursor hooks: https://cursor.com/docs/hooks
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor skills: https://cursor.sh/docs/skills

The gate performs static checks only. It does not prove link reachability,
install success, test success, or review acceptance.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path.cwd()
TARGETS = [
    "AGENTS.md",
    ".cursor/rules/cursor-agent-orchestration.mdc",
    ".cursor/rules/rust-sdk-mcp-development.mdc",
    ".cursor/rules/mcp-ui-app-bridge-development.mdc",
    ".cursor/rules/cursor-studio-project-planning.mdc",
    ".cursor/rules/vcu-agent-verification.mdc",
    ".cursor/skills/vcu-auditor/SKILL.md",
    ".cursor/skills/vcu-cartographer/SKILL.md",
    ".cursor/skills/vcu-verification-agent/SKILL.md",
    ".cursor/skills/vcu-knowledgebase-curator/SKILL.md",
    ".cursor/skills/rust-sdk-component-reviewer/SKILL.md",
    ".cursor/skills/mcp-ui-app-bridge-reviewer/SKILL.md",
    ".cursor/skills/cursor-studio-project-planner/SKILL.md",
    ".cursor/skills/cursor-task-assignment-agent/SKILL.md",
    ".cursor/commands/vcu-audit.md",
    ".cursor/commands/vcu-verify.md",
    ".cursor/commands/vcu-catalog.md",
    ".cursor/commands/vcu-seed-dry-run.md",
    ".cursor/commands/rust-sdk-check.md",
    ".cursor/commands/mcp-ui-check.md",
    ".cursor/commands/lesson-artifacts-next.md",
    ".cursor/commands/cursor-studio-plan.md",
    ".cursor/commands/cursor-task-assign.md",
    ".cursor/agents/*.md",
    ".cursor/hooks/vcu_artifact_gate.py",
    "docs/vcu/agents/vcu-auditor-agent.md",
    "docs/vcu/agents/vcu-cartographer-agent.md",
    "docs/vcu/agents/vcu-verification-agent.md",
    "docs/vcu/agents/vcu-knowledgebase-agent.md",
    "docs/vcu/agents/rust-sdk-agent.md",
    "docs/vcu/agents/mcp-ui-agent.md",
    "docs/vcu/agents/cursor-studio-planner-agent.md",
    "docs/vcu/agents/cursor-task-assignment-agent.md",
    "docs/vcu/skill-identity-registry.md",
    "docs/vcu/cursor-agent-operating-layer-report.md",
]
REQUIRED_URL = re.compile(r"https?://")
NO_MOCK = re.compile(r"no[- ]mock|mock lesson|mock install|mock test|fake log|simulated exit code|placeholder evidence|fabricated|unsupported source", re.I)
OUTPUT = re.compile(r"verifiable output|output contract|return .*remaining_unverified|remaining `blocked`", re.I | re.S)
FORBIDDEN = [
    "simulated exit code",
    "fake log",
    "placeholder evidence",
    "mock install",
    "mock test",
    "fabricated review",
]
PROHIBITION = re.compile(r"do not|never|no[- ]mock|reject|prohibit|must not|cannot|without real", re.I)

def iter_files() -> list[Path]:
    files: set[Path] = set()
    for pattern in TARGETS:
        files.update(p for p in ROOT.glob(pattern) if p.is_file())
    return sorted(files)

def check_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8", errors="replace")
    rel = path.relative_to(ROOT)
    issues: list[str] = []
    if not REQUIRED_URL.search(text) and "docs/vcu/api-docs.md" not in text:
        issues.append(f"{rel}: missing docs URL or VCU source registry reference")
    if not NO_MOCK.search(text):
        issues.append(f"{rel}: missing no-mock gate language")
    if rel.suffix in {".md", ".mdc"} and not OUTPUT.search(text):
        issues.append(f"{rel}: missing verifiable output/output contract language")
    if path.suffix != ".py":
        for line_no, line in enumerate(text.splitlines(), start=1):
            lowered = line.lower()
            if any(term in lowered for term in FORBIDDEN) and not PROHIBITION.search(line):
                issues.append(f"{rel}:{line_no}: possible unsupported evidence phrase: {line.strip()}")
    return issues

def main() -> int:
    if not (ROOT / ".cursor").exists():
        print("blocked: run from repository root", file=sys.stderr)
        return 2
    issues = []
    for path in iter_files():
        issues.extend(check_file(path))
    if issues:
        print("VCU artifact gate: blocked")
        for issue in issues:
            print(f"- {issue}")
        return 1
    print("VCU artifact gate: static checks passed")
    print("Runtime link checks, installs, tests, and Cursor hook invocation remain unverified unless separately run.")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except json.JSONDecodeError as exc:
        print(f"unverified: hook payload was not JSON: {exc}", file=sys.stderr)
        sys.exit(1)
