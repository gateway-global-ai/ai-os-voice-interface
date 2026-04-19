# AIOS Kernel Foundation

## Purpose
AIOS is a local-first operating environment. The kernel is responsible for deterministic routing, persisted state, and UI contract selection. The LLM is not the kernel. The model may transform data, but it does not authorize state transitions, select tools, or define the UI contract.

## Grounded Environment
- Single local user
- Single machine
- Offline-first operation
- One active intent at a time
- SQLite as the first persisted state store
- No conversational memory tables
- No prompt-defined routing authority
- No direct model-initiated tool execution

## Kernel-Managed Activities
- Normalize raw input into a bounded intent identifier.
- Read and update the active operating state.
- Select the allowed execution route for the current intent.
- Assemble only the minimum context required for the current intent.
- Compute aptitude, atrophy, and verbosity decay deterministically.
- Select the UI verbosity contract before the frontend renders.
- Validate tool and execution outputs against the current state contract.
- Enforce interrupt, abort, and recovery transitions.

## Model-Managed Activities
- Transform a bounded payload into a bounded output.
- Extract fields from text or structured context.
- Summarize scoped data selected by the kernel.
- Generate candidate phrasing for voice or shell presentation.

## Persistence Contracts
### `active_state`
- Purpose: exact current operating state for the shell and kernel.
- Columns:
  - `current_intent`
  - `status`
  - `active_context_pointer`

### `user_aptitude`
- Purpose: per-intent mastery and UI verbosity state.
- Columns:
  - `id`
  - `intent_category`
  - `success_count`
  - `avg_response_time_ms`
  - `avg_context_ratio`
  - `victory_score`
  - `last_executed_timestamp`
  - `current_verbosity_level`

### `knowledge_graph`
- Purpose: compact operational knowledge linked to intents, not transcript memory.
- Columns:
  - `intent_id`
  - `required_parameters`
  - `system_instructions`

## Route Contracts
### `get_os_state()`
- Reads `active_state`.
- Resolves the current verbosity contract from `user_aptitude`.
- Applies inactivity decay before returning a result.

### `update_intent(new_intent)`
- Normalizes and writes the next active intent.
- Sets `status = routing`.
- Advances `active_context_pointer` to the intent route.

### `record_outcome(intent, completion_time_ms, context_ratio)`
- Validates telemetry inputs.
- Updates rolling performance fields in `user_aptitude`.
- Calculates `victory_score` from bounded deterministic math.
- Applies fixed-threshold verbosity selection.
- Stamps `last_executed_timestamp`.
- Returns the updated mastery and UI contract.

## Deterministic UI Contract
The frontend must not infer verbosity on its own. It renders exactly what the kernel returns.

- `book`: novice mode, maximum scaffolding
- `paragraph`: learning mode, primary labels and short helper text
- `sentence`: competent mode, minimal interface with direct targets
- `start_button`: mastery mode, bare execution surface

## Rust Module Boundaries
The backend foundation should stay split into focused modules.

- `models`: shared enums and serialized return types
- `db`: managed SQLite connection state
- `migrations`: WAL setup, schema creation, and `user_version` upgrades
- `scoring`: victory score, atrophy decay, and verbosity thresholds
- `store`: query and write helpers against SQLite
- `service`: orchestration for the public kernel operations

## First Expansion Targets
- Add `intent_registry` once intent taxonomy is stable.
- Add `transition_log` when state replay and auditability are needed.
- Add `tool_contracts` when local tool dispatch becomes first-class.
