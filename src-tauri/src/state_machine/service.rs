use crate::state_machine::migrations::initialize_schema;
use crate::state_machine::scoring::{
    apply_atrophy_decay, calculate_victory_score, current_unix_timestamp, derive_verbosity_level,
    normalize_intent,
};
use crate::state_machine::models::ConversationMessage;
use crate::state_machine::store::{
    load_active_state, load_node_contract, load_user_aptitude, resolve_verbosity_level,
    upsert_active_state,
};
use crate::state_machine::{AiosDbState, AiosResult, OsStateSnapshot, OutcomeSnapshot};
use rusqlite::{params, Connection};
use std::fs;
use std::path::PathBuf;

pub fn initialize_database(app_local_data_dir: PathBuf) -> AiosResult<Connection> {
    fs::create_dir_all(&app_local_data_dir)?;

    let database_path = app_local_data_dir.join("aios_state.db");
    let connection = Connection::open(database_path)?;
    initialize_schema(&connection)?;

    Ok(connection)
}

pub fn get_os_state_snapshot(state: &AiosDbState) -> AiosResult<OsStateSnapshot> {
    state.with_connection(|connection| {
        let active_state = load_active_state(connection)?;
        let verbosity_level = resolve_verbosity_level(connection, &active_state.current_intent)?;
        let contract = load_node_contract(connection, &active_state.current_intent)?;

        Ok(OsStateSnapshot {
            current_intent: active_state.current_intent,
            status: active_state.status,
            active_context_pointer: active_state.active_context_pointer,
            current_verbosity_level: verbosity_level,
            permitted_ui_components: contract.permitted_ui_components,
            available_skills: contract.available_skills,
            active_project_nodes: None,
        })
    })
}

pub fn update_active_intent(state: &AiosDbState, new_intent: String) -> AiosResult<OsStateSnapshot> {
    let normalized_intent = normalize_intent(&new_intent)?;
    let context_pointer = format!("intent::{normalized_intent}");

    state.with_connection(|connection| {
        upsert_active_state(connection, &normalized_intent, "routing", &context_pointer)?;
        let verbosity_level = resolve_verbosity_level(connection, &normalized_intent)?;
        let contract = load_node_contract(connection, &normalized_intent)?;

        Ok(OsStateSnapshot {
            current_intent: normalized_intent,
            status: "routing".to_string(),
            active_context_pointer: context_pointer,
            current_verbosity_level: verbosity_level,
            permitted_ui_components: contract.permitted_ui_components,
            available_skills: contract.available_skills,
            active_project_nodes: None,
        })
    })
}

pub fn record_outcome_entry(
    state: &AiosDbState,
    intent: String,
    completion_time_ms: i32,
    context_ratio: f32,
) -> AiosResult<OutcomeSnapshot> {
    let normalized_intent = normalize_intent(&intent)?;

    if completion_time_ms <= 0 {
        return Err(crate::state_machine::AiosStateError::InvalidInput(
            "completion_time_ms must be greater than zero".to_string(),
        ));
    }

    if !(0.0..=1.0).contains(&context_ratio) {
        return Err(crate::state_machine::AiosStateError::InvalidInput(
            "context_ratio must be between 0.0 and 1.0".to_string(),
        ));
    }

    let executed_at_timestamp = current_unix_timestamp()?;

    state.with_connection(|connection| {
        let current_row = load_user_aptitude(connection, &normalized_intent)?;
        let prior_success_count = current_row
            .as_ref()
            .map(|row| row.success_count)
            .unwrap_or(0);
        let prior_avg_response_time_ms = current_row
            .as_ref()
            .map(|row| row.avg_response_time_ms)
            .unwrap_or(0);
        let prior_avg_context_ratio = current_row
            .as_ref()
            .map(|row| row.avg_context_ratio)
            .unwrap_or(1.0);

        let updated_success_count = prior_success_count + 1;
        let updated_avg_response_time_ms = if prior_success_count == 0 {
            i64::from(completion_time_ms)
        } else {
            ((prior_avg_response_time_ms * prior_success_count) + i64::from(completion_time_ms))
                / updated_success_count
        };
        let updated_avg_context_ratio = if prior_success_count == 0 {
            context_ratio
        } else {
            ((prior_avg_context_ratio * (prior_success_count as f32)) + context_ratio)
                / (updated_success_count as f32)
        };
        let updated_victory_score = apply_atrophy_decay(
            calculate_victory_score(
                updated_success_count,
                updated_avg_response_time_ms,
                updated_avg_context_ratio,
            ),
            executed_at_timestamp,
            executed_at_timestamp,
        );
        let updated_verbosity = derive_verbosity_level(updated_victory_score);

        connection.execute(
            "INSERT INTO user_aptitude (
                intent_category,
                success_count,
                avg_response_time_ms,
                avg_context_ratio,
                victory_score,
                last_executed_timestamp,
                current_verbosity_level
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(intent_category) DO UPDATE SET
                success_count = excluded.success_count,
                avg_response_time_ms = excluded.avg_response_time_ms,
                avg_context_ratio = excluded.avg_context_ratio,
                victory_score = excluded.victory_score,
                last_executed_timestamp = excluded.last_executed_timestamp,
                current_verbosity_level = excluded.current_verbosity_level",
            params![
                normalized_intent,
                updated_success_count,
                updated_avg_response_time_ms,
                updated_avg_context_ratio,
                updated_victory_score,
                executed_at_timestamp,
                updated_verbosity.as_str()
            ],
        )?;

        let active_context_pointer = format!("outcome::{normalized_intent}");
        upsert_active_state(connection, &normalized_intent, "idle", &active_context_pointer)?;

        Ok(OutcomeSnapshot {
            intent_category: normalized_intent,
            success_count: updated_success_count,
            avg_response_time_ms: updated_avg_response_time_ms,
            avg_context_ratio: updated_avg_context_ratio,
            victory_score: updated_victory_score,
            last_executed_timestamp: executed_at_timestamp,
            current_verbosity_level: updated_verbosity,
            recorded_context_ratio: context_ratio,
        })
    })
}

/// Retrieve the most recent 100 messages, returned in chronological order (oldest first).
pub fn get_conversation_history(state: &AiosDbState) -> AiosResult<Vec<ConversationMessage>> {
    state.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT message_id, role, text, timestamp_ms
             FROM conversation_history
             ORDER BY timestamp_ms DESC
             LIMIT 100",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(ConversationMessage {
                message_id: row.get(0)?,
                role: row.get(1)?,
                text: row.get(2)?,
                timestamp_ms: row.get(3)?,
            })
        })?;
        let mut history: Vec<ConversationMessage> = rows.filter_map(|r| r.ok()).collect();
        history.reverse(); // oldest first
        Ok(history)
    })
}

/// Upsert (insert or replace) the NodeContract for `intent_id`.
/// This lets the Kernel register or update which UI components and skills
/// are permitted for a specific intent at runtime.
pub fn upsert_node_contract(
    state: &AiosDbState,
    intent_id: String,
    permitted_ui_components: Vec<String>,
    available_skills: Vec<String>,
) -> AiosResult<()> {
    use serde_json;
    let components_json = serde_json::to_string(&permitted_ui_components)
        .map_err(|e| crate::state_machine::AiosStateError::InvalidData(e.to_string()))?;
    let skills_json = serde_json::to_string(&available_skills)
        .map_err(|e| crate::state_machine::AiosStateError::InvalidData(e.to_string()))?;

    state.with_connection(|connection| {
        connection.execute(
            "INSERT INTO node_contract (intent_id, permitted_ui_components, available_skills)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(intent_id) DO UPDATE SET
                 permitted_ui_components = excluded.permitted_ui_components,
                 available_skills        = excluded.available_skills",
            rusqlite::params![intent_id, components_json, skills_json],
        )?;
        Ok(())
    })
}
pub fn append_conversation_message(
    state: &AiosDbState,
    msg: ConversationMessage,
) -> AiosResult<()> {
    state.with_connection(|conn| {
        conn.execute(
            "INSERT OR IGNORE INTO conversation_history
             (message_id, role, text, timestamp_ms)
             VALUES (?1, ?2, ?3, ?4)",
            params![msg.message_id, msg.role, msg.text, msg.timestamp_ms],
        )?;
        Ok(())
    })
}
