use crate::state_machine::constants::{
    CURRENT_SCHEMA_VERSION, DEFAULT_CONTEXT_POINTER, DEFAULT_INTENT, DEFAULT_INTENT_CATEGORY,
    DEFAULT_STATUS,
};
use crate::state_machine::{AiosResult, AiosStateError, VerbosityLevel};
use rusqlite::{params, Connection, OptionalExtension};

const SCHEMA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS user_aptitude (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intent_category TEXT NOT NULL UNIQUE,
    success_count INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms INTEGER NOT NULL DEFAULT 0,
    avg_context_ratio REAL NOT NULL DEFAULT 1.0,
    victory_score REAL NOT NULL DEFAULT 0.0,
    last_executed_timestamp INTEGER NOT NULL DEFAULT 0,
    current_verbosity_level TEXT NOT NULL DEFAULT 'book'
        CHECK (current_verbosity_level IN ('book', 'paragraph', 'sentence', 'start_button'))
);

CREATE TABLE IF NOT EXISTS active_state (
    current_intent TEXT NOT NULL,
    status TEXT NOT NULL,
    active_context_pointer TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_graph (
    intent_id TEXT PRIMARY KEY,
    required_parameters TEXT NOT NULL,
    system_instructions TEXT NOT NULL
);
"#;

pub(crate) fn initialize_schema(connection: &Connection) -> AiosResult<()> {
    configure_database(connection)?;
    run_migrations(connection)?;
    seed_defaults(connection)?;
    crate::intent_loop::initialize_intent_loop_schema(connection)?;
    Ok(())
}

fn configure_database(connection: &Connection) -> AiosResult<()> {
    connection.execute_batch(
        r#"
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
"#,
    )?;

    Ok(())
}

fn run_migrations(connection: &Connection) -> AiosResult<()> {
    let mut user_version = read_user_version(connection)?;

    if user_version < 1 {
        migrate_to_v1(connection)?;
        write_user_version(connection, 1)?;
        user_version = 1;
    }

    if user_version < 2 {
        migrate_to_v2(connection)?;
        write_user_version(connection, 2)?;
        user_version = 2;
    }

    if user_version < 3 {
        migrate_to_v3(connection)?;
        write_user_version(connection, 3)?;
        user_version = 3;
    }

    if user_version != CURRENT_SCHEMA_VERSION {
        return Err(AiosStateError::InvalidData(format!(
            "unsupported schema version after migrations: {user_version}"
        )));
    }

    Ok(())
}

fn read_user_version(connection: &Connection) -> AiosResult<i32> {
    let version = connection.pragma_query_value(None, "user_version", |row| row.get(0))?;
    Ok(version)
}

fn write_user_version(connection: &Connection, version: i32) -> AiosResult<()> {
    connection.pragma_update(None, "user_version", version)?;
    Ok(())
}

fn migrate_to_v1(connection: &Connection) -> AiosResult<()> {
    let user_aptitude_exists: Option<String> = connection
        .query_row(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_aptitude'",
            [],
            |row| row.get(0),
        )
        .optional()?;

    if user_aptitude_exists.is_none() {
        connection.execute_batch(SCHEMA_SQL)?;
        return Ok(());
    }

    connection.execute_batch(
        r#"
BEGIN IMMEDIATE TRANSACTION;
CREATE TABLE user_aptitude_next (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intent_category TEXT NOT NULL UNIQUE,
    success_count INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms INTEGER NOT NULL DEFAULT 0,
    avg_context_ratio REAL NOT NULL DEFAULT 1.0,
    victory_score REAL NOT NULL DEFAULT 0.0,
    last_executed_timestamp INTEGER NOT NULL DEFAULT 0,
    current_verbosity_level TEXT NOT NULL DEFAULT 'book'
        CHECK (current_verbosity_level IN ('book', 'paragraph', 'sentence', 'start_button'))
);
INSERT INTO user_aptitude_next (
    id,
    intent_category,
    success_count,
    avg_response_time_ms,
    avg_context_ratio,
    victory_score,
    last_executed_timestamp,
    current_verbosity_level
)
SELECT
    id,
    intent_category,
    success_count,
    avg_response_time_ms,
    1.0,
    0.0,
    0,
    CASE current_verbosity_level
        WHEN 'guide' THEN 'paragraph'
        WHEN 'summary' THEN 'paragraph'
        WHEN 'minimal' THEN 'sentence'
        ELSE current_verbosity_level
    END
FROM user_aptitude;
DROP TABLE user_aptitude;
ALTER TABLE user_aptitude_next RENAME TO user_aptitude;
COMMIT;
"#,
    )?;

    connection.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS active_state (
    current_intent TEXT NOT NULL,
    status TEXT NOT NULL,
    active_context_pointer TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_graph (
    intent_id TEXT PRIMARY KEY,
    required_parameters TEXT NOT NULL,
    system_instructions TEXT NOT NULL
);
"#,
    )?;

    Ok(())
}

fn seed_defaults(connection: &Connection) -> AiosResult<()> {
    connection.execute(
        "INSERT INTO user_aptitude (
            intent_category,
            success_count,
            avg_response_time_ms,
            avg_context_ratio,
            victory_score,
            last_executed_timestamp,
            current_verbosity_level
         ) VALUES (?1, 0, 0, 1.0, 0.0, 0, ?2)
         ON CONFLICT(intent_category) DO NOTHING",
        params![DEFAULT_INTENT_CATEGORY, VerbosityLevel::Book.as_str()],
    )?;

    let active_state_exists: Option<i64> = connection
        .query_row("SELECT 1 FROM active_state LIMIT 1", [], |row| row.get(0))
        .optional()?;

    if active_state_exists.is_none() {
        connection.execute(
            "INSERT INTO active_state (current_intent, status, active_context_pointer)
             VALUES (?1, ?2, ?3)",
            params![DEFAULT_INTENT, DEFAULT_STATUS, DEFAULT_CONTEXT_POINTER],
        )?;
    }

    Ok(())
}

fn migrate_to_v2(connection: &Connection) -> AiosResult<()> {
    connection.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS conversation_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id   TEXT    NOT NULL UNIQUE,
    role         TEXT    NOT NULL CHECK(role IN ('user', 'agent')),
    text         TEXT    NOT NULL,
    timestamp_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ch_ts
    ON conversation_history(timestamp_ms);
"#,
    )?;
    Ok(())
}

fn migrate_to_v3(connection: &Connection) -> AiosResult<()> {
    // node_contract stores the command surface published by the Kernel for each intent.
    // permitted_ui_components and available_skills are stored as JSON arrays.
    // The special intent_id '*' is the wildcard / default contract.
    connection.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS node_contract (
    intent_id              TEXT PRIMARY KEY,
    permitted_ui_components TEXT NOT NULL DEFAULT '[]',
    available_skills        TEXT NOT NULL DEFAULT '[]'
);

-- Wildcard default: every intent gets at minimum voice PTT + chat input.
INSERT OR IGNORE INTO node_contract (intent_id, permitted_ui_components, available_skills)
VALUES (
    '*',
    '["voice_ptt","chat_input"]',
    '[]'
);

-- Intents that authorise file-system access surface the file_upload component
-- and its backing skills so the UI can render them deterministically.
INSERT OR IGNORE INTO node_contract (intent_id, permitted_ui_components, available_skills)
VALUES (
    'file_analysis',
    '["voice_ptt","chat_input","file_upload"]',
    '["read_file","list_directory","pick_file"]'
);

INSERT OR IGNORE INTO node_contract (intent_id, permitted_ui_components, available_skills)
VALUES (
    'workspace',
    '["voice_ptt","chat_input","file_upload"]',
    '["read_file","list_directory","pick_file"]'
);

-- Onboarding intent — no file surface during guided flow.
INSERT OR IGNORE INTO node_contract (intent_id, permitted_ui_components, available_skills)
VALUES (
    'onboarding',
    '["voice_ptt","chat_input"]',
    '[]'
);

-- Idle: voice and chat only.
INSERT OR IGNORE INTO node_contract (intent_id, permitted_ui_components, available_skills)
VALUES (
    'idle',
    '["voice_ptt","chat_input"]',
    '[]'
);
"#,
    )?;
    Ok(())
}
