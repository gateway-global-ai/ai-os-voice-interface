use crate::state_machine::constants::DEFAULT_INTENT_CATEGORY;
use crate::state_machine::models::{ActiveStateRow, NodeContractRow, UserAptitudeRow};
use crate::state_machine::scoring::{
    apply_atrophy_decay, current_unix_timestamp, derive_verbosity_level,
};
use crate::state_machine::{AiosResult, AiosStateError, VerbosityLevel};
use rusqlite::{params, Connection, OptionalExtension};

pub(crate) fn load_active_state(connection: &Connection) -> AiosResult<ActiveStateRow> {
    let row = connection.query_row(
        "SELECT current_intent, status, active_context_pointer
         FROM active_state
         LIMIT 1",
        [],
        |row| {
            Ok(ActiveStateRow {
                current_intent: row.get(0)?,
                status: row.get(1)?,
                active_context_pointer: row.get(2)?,
            })
        },
    )?;

    Ok(row)
}

pub(crate) fn resolve_verbosity_level(
    connection: &Connection,
    intent_category: &str,
) -> AiosResult<VerbosityLevel> {
    if let Some(row) = load_or_refresh_aptitude(connection, intent_category)? {
        return Ok(row.current_verbosity_level);
    }

    let default_row = load_or_refresh_aptitude(connection, DEFAULT_INTENT_CATEGORY)?.ok_or_else(|| {
        AiosStateError::InvalidData("missing default global user_aptitude row".to_string())
    })?;

    Ok(default_row.current_verbosity_level)
}

pub(crate) fn load_user_aptitude(
    connection: &Connection,
    intent_category: &str,
) -> AiosResult<Option<UserAptitudeRow>> {
    let row = connection
        .query_row(
            "SELECT
                success_count,
                avg_response_time_ms,
                avg_context_ratio,
                victory_score,
                last_executed_timestamp,
                current_verbosity_level
             FROM user_aptitude
             WHERE intent_category = ?1",
            params![intent_category],
            |row| {
                let verbosity: String = row.get(5)?;
                Ok(UserAptitudeRow {
                    success_count: row.get(0)?,
                    avg_response_time_ms: row.get(1)?,
                    avg_context_ratio: row.get(2)?,
                    victory_score: row.get(3)?,
                    last_executed_timestamp: row.get(4)?,
                    current_verbosity_level: VerbosityLevel::from_db(&verbosity).map_err(|error| {
                        rusqlite::Error::FromSqlConversionFailure(
                            5,
                            rusqlite::types::Type::Text,
                            Box::new(error),
                        )
                    })?,
                })
            },
        )
        .optional()?;

    Ok(row)
}

pub(crate) fn load_or_refresh_aptitude(
    connection: &Connection,
    intent_category: &str,
) -> AiosResult<Option<UserAptitudeRow>> {
    let Some(row) = load_user_aptitude(connection, intent_category)? else {
        return Ok(None);
    };

    let current_timestamp = current_unix_timestamp()?;
    let decayed_victory_score =
        apply_atrophy_decay(row.victory_score, row.last_executed_timestamp, current_timestamp);
    let decayed_verbosity_level = derive_verbosity_level(decayed_victory_score);

    if (decayed_victory_score - row.victory_score).abs() > f32::EPSILON
        || decayed_verbosity_level.as_str() != row.current_verbosity_level.as_str()
    {
        connection.execute(
            "UPDATE user_aptitude
             SET victory_score = ?1, current_verbosity_level = ?2
             WHERE intent_category = ?3",
            params![
                decayed_victory_score,
                decayed_verbosity_level.as_str(),
                intent_category
            ],
        )?;
    }

    Ok(Some(UserAptitudeRow {
        success_count: row.success_count,
        avg_response_time_ms: row.avg_response_time_ms,
        avg_context_ratio: row.avg_context_ratio,
        victory_score: decayed_victory_score,
        last_executed_timestamp: row.last_executed_timestamp,
        current_verbosity_level: decayed_verbosity_level,
    }))
}

pub(crate) fn upsert_active_state(
    connection: &Connection,
    current_intent: &str,
    status: &str,
    active_context_pointer: &str,
) -> AiosResult<()> {
    let rows_updated = connection.execute(
        "UPDATE active_state
         SET current_intent = ?1, status = ?2, active_context_pointer = ?3",
        params![current_intent, status, active_context_pointer],
    )?;

    if rows_updated == 0 {
        connection.execute(
            "INSERT INTO active_state (current_intent, status, active_context_pointer)
             VALUES (?1, ?2, ?3)",
            params![current_intent, status, active_context_pointer],
        )?;
    }

    Ok(())
}

/// Look up the NodeContract for `intent_id`.
/// Falls back to the wildcard `*` row if no exact match exists.
/// Returns an empty contract (voice_ptt + chat_input only) if neither row is found.
pub(crate) fn load_node_contract(
    connection: &Connection,
    intent_id: &str,
) -> AiosResult<NodeContractRow> {
    fn parse_json_string_array(raw: &str) -> Vec<String> {
        serde_json::from_str::<Vec<String>>(raw).unwrap_or_default()
    }

    // Try exact match first, then wildcard.
    let row: Option<(String, String)> = connection
        .query_row(
            "SELECT permitted_ui_components, available_skills
             FROM node_contract
             WHERE intent_id = ?1
             LIMIT 1",
            params![intent_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()?;

    if let Some((components_json, skills_json)) = row {
        return Ok(NodeContractRow {
            permitted_ui_components: parse_json_string_array(&components_json),
            available_skills: parse_json_string_array(&skills_json),
        });
    }

    // Wildcard fallback.
    let wildcard: Option<(String, String)> = connection
        .query_row(
            "SELECT permitted_ui_components, available_skills
             FROM node_contract
             WHERE intent_id = '*'
             LIMIT 1",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()?;

    if let Some((components_json, skills_json)) = wildcard {
        return Ok(NodeContractRow {
            permitted_ui_components: parse_json_string_array(&components_json),
            available_skills: parse_json_string_array(&skills_json),
        });
    }

    // Absolute fallback — kernel never leaves the UI with zero commands.
    Ok(NodeContractRow {
        permitted_ui_components: vec!["voice_ptt".to_string(), "chat_input".to_string()],
        available_skills: vec![],
    })
}
