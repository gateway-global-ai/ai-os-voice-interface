---
description: Run a VCU lesson with source-backed commands and no-mock evidence
---

# /vcu-run-lesson

Relevant docs:
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands
- Cursor plugins: https://cursor.com/docs/plugins.md
- VCU API docs registry: docs/vcu/api-docs.md

Use `@vcu-lesson-runner` to run the current lesson. Do not generate missing per-lesson artifacts from memory. Read the lesson sources, inspect real files, run real available commands, and report missing evidence as `blocked` or `unverified`.

Verifiable output: source URLs, files inspected, commands run, environment, exit codes, important stdout/stderr, no-mock gate result, and remaining blocked/unverified items.
