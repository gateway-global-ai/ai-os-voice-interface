# VCU Lesson Support Cursor Plugin

Relevant docs:
- Cursor plugins: https://cursor.com/docs/plugins.md
- Cursor plugin reference: https://cursor.com/docs/reference/plugins
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor skills: https://cursor.sh/docs/skills

This package gives Vibe Coding University students a verified Cursor file structure for lesson support. It is intentionally generic and does not generate per-lesson artifacts.

## Install Locally

Copy or symlink this folder to:

```bash
~/.cursor/plugins/local/vcu-lesson-support
```

Then restart Cursor or run Developer: Reload Window. Confirm the `vcu-lesson-support` rule, `vcu-lesson-runner` skill, `vcu-lesson-runner-agent`, and `/vcu-run-lesson` command are visible.

## No-Mock Gate

Do not create mock lessons, mock installs, mock tests, fake logs, simulated exit codes, placeholder evidence, fabricated reviews, or unsupported source claims. If verification cannot be produced, report `blocked` or `unverified`.

## Verifiable Output

Every lesson run must include source URLs, files inspected, commands run, environment, exit codes, important output, and remaining blocked/unverified items.
