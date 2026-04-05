# Scope efficiency evidence (seed)

Append one JSON object per line to `scope_efficiency_log.jsonl` (create locally; gitignored).

**Stable fields** (use every time for consistency):

| Field | Meaning |
|-------|---------|
| `ts` | ISO-8601 timestamp |
| `flow_id` | Short stable id for the run (e.g. `mail-sum-001`, `cal-list-002`, `cal-get-003`) |
| `intent` | Workspace intent id |
| `scope_resource_count` | `review_files.length + modify_files.length` (from envelope or note `n/a`) |
| `bounded_prompt_chars` | Bounded LLM prompt size when relevant; else `null` |
| `output_quality` | `ok` \| `degraded` \| `n/a` |
| `scope_outcome` | `allowed` \| `denied` \| `routing_invalid` \| `escalated` \| `n/a` |
| `notes` | Result quality, error snippet, audit id, or denial reason |

Optional: `task` (human label), `denial_reason` (when denied), `audit_id`, `metrics_snapshot` (copy from dev HUD if useful).

Use `scope_efficiency_log.example.jsonl` as a template — it includes **success** and **deny** examples.

**Deny-path rows** matter as much as happy paths: log attempted action, why denied, what the envelope allowed, and rough HUD metrics after the attempt.
