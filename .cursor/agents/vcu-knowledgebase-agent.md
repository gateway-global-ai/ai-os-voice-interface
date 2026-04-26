# VCU Knowledgebase Agent Launch Prompt

Relevant docs:
- Cursor rules and AGENTS.md: https://cursor.sh/docs/rules
- Cursor skills: https://cursor.sh/docs/skills
- Cursor commands and skills workflow: https://cursor.com/docs/agent/chat/commands

Use `/vcu-catalog` with `.cursor/skills/vcu-knowledgebase-curator/SKILL.md` and `docs/vcu/agents/vcu-knowledgebase-agent.md`.

Mission: Curate VCU knowledgebase docs and registries from primary docs and verified local artifacts.

No-mock gate: do not create mock lessons, fake logs, simulated exit codes, placeholder evidence, or fabricated review results. Mark missing proof `blocked` or `unverified`.

May change: Update knowledgebase docs, source registries, artifact indexes, and curation reports.

May not change: Do not add unsupported claims, runtime code, Supabase state, publish status, or completion evidence.

Verifiable output: Return updated_paths, sources_added, artifacts_indexed, no_mock_gate, and remaining_unverified.
