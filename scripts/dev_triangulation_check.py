#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Validate dev triangulation review packages (BL-008). See AIOS-DEV-TRI-001."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV_TRI = ROOT / "docs" / "reviews" / "dev_triangulation"

# Filename patterns for Round 1 triangulation + Ollama UI lane
R1_PATTERNS = (
    ("deepseek", re.compile(r"deepseek", re.I)),
    ("openai", re.compile(r"openai", re.I)),
    ("gemini", re.compile(r"gemini", re.I)),
    ("ollama_ui", re.compile(r"ollama", re.I)),
)


def has_mermaid(md: str) -> bool:
    return "```mermaid" in md.lower()


def list_topic_dirs() -> list[Path]:
    if not DEV_TRI.is_dir():
        return []
    out: list[Path] = []
    for p in sorted(DEV_TRI.iterdir()):
        if p.is_dir() and not p.name.startswith(("_", ".")):
            out.append(p)
    return out


def validate_topic(topic: Path, require_round2: bool) -> list[str]:
    errs: list[str] = []
    if not topic.is_dir():
        return [f"not a directory: {topic}"]

    scope = topic / "SCOPE.md"
    manifest = topic / "KB_MANIFEST.md"
    if not scope.is_file():
        errs.append(f"missing {scope.relative_to(ROOT)}")
    elif scope.stat().st_size < 40:
        errs.append(f"SCOPE.md too short (< 40 bytes): {scope.relative_to(ROOT)}")
    if not manifest.is_file():
        errs.append(f"missing {manifest.relative_to(ROOT)}")
    elif manifest.stat().st_size < 40:
        errs.append(f"KB_MANIFEST.md too short (< 40 bytes): {manifest.relative_to(ROOT)}")

    def check_round(label: str, rd: Path) -> None:
        if not rd.is_dir():
            errs.append(f"missing {rd.relative_to(ROOT)}/")
            return
        files = sorted(rd.glob("review_*.md"))
        if label == "round_1" and len(files) < 4:
            errs.append(
                f"{rd.relative_to(ROOT)}: need >= 4 review_*.md (triangulation + Ollama), found {len(files)}"
            )
        names_concat = " ".join(f.name for f in files)
        if label == "round_1":
            for name, pat in R1_PATTERNS:
                if not pat.search(names_concat):
                    errs.append(
                        f"{rd.relative_to(ROOT)}: no review file matching *{name}* in filename"
                    )
        for f in files:
            text = f.read_text(encoding="utf-8", errors="replace")
            if not has_mermaid(text):
                errs.append(f"{f.relative_to(ROOT)}: missing ```mermaid fenced block")

    check_round("round_1", topic / "round_1")
    if require_round2:
        check_round("round_2", topic / "round_2")
        for name in ("REVIEW_SYNTHESIS.md", "DEV_REVIEW_GATE_REPORT.md"):
            p = topic / name
            if not p.is_file():
                errs.append(f"missing {p.relative_to(ROOT)}")

    return errs


def validate_baseline() -> list[str]:
    errs: list[str] = []
    meta = DEV_TRI / "META_PROMPT_TEMPLATE.md"
    proc = ROOT / "docs" / "implementation" / "AIOS-DEVELOPMENT-TRIANGULATION-PROCESS.md"
    if not meta.is_file():
        errs.append(f"missing {meta.relative_to(ROOT)}")
    if not proc.is_file():
        errs.append(f"missing {proc.relative_to(ROOT)}")
    return errs


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate dev triangulation packages (AIOS-DEV-TRI-001).")
    ap.add_argument(
        "--topic",
        type=str,
        default=None,
        help="Topic folder name under docs/reviews/dev_triangulation/<topic>/",
    )
    ap.add_argument(
        "--full-gate",
        action="store_true",
        help="Require round_2 + REVIEW_SYNTHESIS + DEV_REVIEW_GATE_REPORT",
    )
    ap.add_argument(
        "--strict-topics",
        action="store_true",
        help="Fail if there are topic dirs but none pass validation (after --topic or scan all)",
    )
    args = ap.parse_args()

    baseline = validate_baseline()
    if baseline:
        print("BL-008 baseline errors:", file=sys.stderr)
        for e in baseline:
            print(f"  {e}", file=sys.stderr)
        return 1

    if args.topic:
        topic = DEV_TRI / args.topic
        errs = validate_topic(topic, require_round2=args.full_gate)
        if errs:
            print(f"Topic {args.topic}:", file=sys.stderr)
            for e in errs:
                print(f"  {e}", file=sys.stderr)
            return 1
        print(f"OK: {topic.relative_to(ROOT)}")
        return 0

    topics = list_topic_dirs()
    if not topics:
        print("OK: no topic folders under docs/reviews/dev_triangulation/ (baseline files present).")
        return 0

    if args.strict_topics:
        failed = False
        for t in topics:
            errs = validate_topic(t, require_round2=args.full_gate)
            if errs:
                failed = True
                print(f"{t.name}:", file=sys.stderr)
                for e in errs:
                    print(f"  {e}", file=sys.stderr)
        return 1 if failed else 0

    print(
        "OK: baseline only. Topic folders present:",
        ", ".join(t.name for t in topics),
        "— run with --topic <name> or --strict-topics to validate.",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
