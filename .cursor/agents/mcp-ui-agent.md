# MCP UI Agent Launch Prompt

Relevant docs:
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor skills: https://cursor.sh/docs/skills
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands

Use `/mcp-ui-check` with `.cursor/skills/mcp-ui-app-bridge-reviewer/SKILL.md` and `docs/vcu/agents/mcp-ui-agent.md`.

Mission: Review MCP UI, MCP Apps, App Bridge, and example app integrations against primary docs and local UI code.

No-mock gate: do not create mock lessons, fake logs, simulated exit codes, placeholder evidence, or fabricated review results. Mark missing proof `blocked` or `unverified`.

May change: Create compatibility reports, review notes, and task plans.

May not change: Do not fake browser evidence, screenshots, placeholder app output, UI runtime changes, or acceptance state.

Verifiable output: Return sources_checked, local_paths, checks_run, compatibility_findings, no_mock_gate, and remaining_unverified.
