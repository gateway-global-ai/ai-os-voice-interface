use crate::state_machine::{AiosDbState, AiosStateError, AiosResult};
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;

const EMBEDDED_SHELL_MENU_REGISTRY_JSON: &str = include_str!("../resources/shell_menu_registry.json");

pub fn initialize_intent_loop_schema(connection: &Connection) -> AiosResult<()> {
    connection.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journey_phases (
    id TEXT PRIMARY KEY,
    step_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS smart_contracts (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    journey_phase_id TEXT NOT NULL,
    intent_id TEXT NOT NULL,
    policy_rules TEXT NOT NULL,
    allowed_actions TEXT NOT NULL,
    billing_boundaries TEXT NOT NULL,
    FOREIGN KEY(role_id) REFERENCES roles(id),
    FOREIGN KEY(journey_phase_id) REFERENCES journey_phases(id),
    FOREIGN KEY(intent_id) REFERENCES intents(id)
);

CREATE TABLE IF NOT EXISTS shell_menus (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shell_menu_levels (
    id TEXT PRIMARY KEY,
    menu_id TEXT NOT NULL,
    level_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY(menu_id) REFERENCES shell_menus(id)
);

CREATE TABLE IF NOT EXISTS shell_menu_items (
    id TEXT PRIMARY KEY,
    level_id TEXT NOT NULL,
    label TEXT NOT NULL,
    action_id TEXT NOT NULL,
    FOREIGN KEY(level_id) REFERENCES shell_menu_levels(id)
);

CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_identity (
    id TEXT PRIMARY KEY,
    identity_key TEXT NOT NULL UNIQUE,
    identity_value TEXT NOT NULL
);
"#,
    ).map_err(|e| crate::state_machine::AiosStateError::InvalidData(e.to_string()))?;

    seed_intent_loop_data(connection)?;

    let user_version: i32 = connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;
    if user_version >= 4 {
        migrate_shell_menu_registry_v4(connection)?;
    }

    Ok(())
}

fn seed_intent_loop_data(connection: &Connection) -> AiosResult<()> {
    // Seed 7-step journey
    let phases = vec![
        ("phase_1", 1, "Probe for Purpose", ""),
        ("phase_2", 2, "Determine Intent", ""),
        ("phase_3", 3, "Make a Plan", ""),
        ("phase_4", 4, "Improve the Plan", ""),
        ("phase_5", 5, "Take the First Step", ""),
        ("phase_6", 6, "Assist with Progress", ""),
        ("phase_7", 7, "Produce an Outcome", ""),
    ];
    for (id, order, name, desc) in phases {
        connection.execute(
            "INSERT OR IGNORE INTO journey_phases (id, step_order, name, description) VALUES (?1, ?2, ?3, ?4)",
            params![id, order, name, desc],
        ).map_err(|e| crate::state_machine::AiosStateError::InvalidData(e.to_string()))?;
    }

    // Seed 3 pillar intents
    let intents = vec![
        ("university", "Vibe Coding University", ""),
        ("community", "Join The Community", ""),
        ("coder", "Let's Build! / The Vibe Coder", ""),
    ];
    for (id, name, desc) in intents {
        connection.execute(
            "INSERT OR IGNORE INTO intents (id, name, description) VALUES (?1, ?2, ?3)",
            params![id, name, desc],
        ).map_err(|e| crate::state_machine::AiosStateError::InvalidData(e.to_string()))?;
    }

    // Seed Pricing contract (as a smart contract or setting, let's put it in smart_contracts for now or just a specific contract)
    // The prompt says: "Seed the DB with the 7-step journey, 3 pillar intents (university, community, coder), and the pricing contract."
    connection.execute(
        "INSERT OR IGNORE INTO roles (id, name, description) VALUES ('guest', 'Guest', 'Unauthenticated user')",
        [],
    ).map_err(|e| crate::state_machine::AiosStateError::InvalidData(e.to_string()))?;

    let policy_rules = serde_json::json!({
        "agentIntent": "Warmly acknowledge the user and validate the exhaustion of \"vibe coding\" (where AI shortcuts break in production). Introduce them to the Vibe Coding University and the Community. Enforce the 7-step onboarding process (Probe for Purpose -> Determine Intent -> Make a Plan -> Improve the Plan -> Take the First Step -> Assist with Progress -> Produce an Outcome). Act as a supportive guide, not a generic chatbot.",
        "userIntent": "Organize my digital life, manage my schedule, and help me stay focused on my core goals.",
        "greetingMessage": "Welcome to AI OS. I know 'vibe coding' can be exhausting when shortcuts break in production. I'm here to guide you through a better way. We have the Vibe Coding University to learn, and the Community to build together. Let's start with our 7-step process: what is your purpose today?"
    }).to_string();

    connection.execute(
        "INSERT OR IGNORE INTO smart_contracts (id, role_id, journey_phase_id, intent_id, policy_rules, allowed_actions, billing_boundaries) 
         VALUES ('pricing_contract', 'guest', 'phase_1', 'university', ?1, '[]', '{\"tier_1\": \"30 Days Free -> $49.95/Month\", \"tier_2\": \"Early Bird: $20/Month\"}')",
        params![policy_rules],
    ).map_err(|e| crate::state_machine::AiosStateError::InvalidData(e.to_string()))?;

    Ok(())
}

/// v4 migration: persist the governed shell menu registry to SQLite and normalize into
/// `shell_menus` / `shell_menu_levels` / `shell_menu_items` for relational queries.
pub fn migrate_shell_menu_registry_v4(connection: &Connection) -> AiosResult<()> {
    connection
        .execute_batch(
            r#"
CREATE TABLE IF NOT EXISTS shell_menu_registry_blob (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    json TEXT NOT NULL
);
"#,
        )
        .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;

    connection
        .execute(
            "INSERT OR REPLACE INTO shell_menu_registry_blob (id, json) VALUES (1, ?1)",
            params![EMBEDDED_SHELL_MENU_REGISTRY_JSON],
        )
        .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;

    let registry: Value = serde_json::from_str(EMBEDDED_SHELL_MENU_REGISTRY_JSON)
        .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;

    connection
        .execute("DELETE FROM shell_menu_items", [])
        .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;
    connection
        .execute("DELETE FROM shell_menu_levels", [])
        .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;
    connection
        .execute("DELETE FROM shell_menus", [])
        .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;

    populate_shell_menu_tables_from_registry(connection, &registry)?;

    Ok(())
}

fn populate_shell_menu_tables_from_registry(connection: &Connection, registry: &Value) -> AiosResult<()> {
    let map = registry
        .as_object()
        .ok_or_else(|| AiosStateError::InvalidData("shell menu registry root must be an object".to_string()))?;

    for (menu_key, entry) in map {
        let name = entry
            .get("record")
            .and_then(|r| r.get("menu_id"))
            .and_then(|v| v.as_str())
            .unwrap_or(menu_key);

        connection
            .execute(
                "INSERT OR REPLACE INTO shell_menus (id, name) VALUES (?1, ?2)",
                params![menu_key, name],
            )
            .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;

        let levels = entry
            .get("record")
            .and_then(|r| r.get("levels"))
            .and_then(|v| v.as_array())
            .ok_or_else(|| {
                AiosStateError::InvalidData(format!("menu {menu_key} missing record.levels array"))
            })?;

        for (order, level) in levels.iter().enumerate() {
            let level_id = level
                .get("level_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let level_label = level
                .get("level_label")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let composite_level_key = format!("{menu_key}::{level_id}");

            connection
                .execute(
                    "INSERT OR REPLACE INTO shell_menu_levels (id, menu_id, level_order, name) VALUES (?1, ?2, ?3, ?4)",
                    params![composite_level_key, menu_key, order as i32, level_label],
                )
                .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;

            let Some(items) = level.get("items").and_then(|v| v.as_array()) else {
                continue;
            };

            for item in items {
                let item_id = item.get("item_id").and_then(|v| v.as_str()).unwrap_or("");
                let label = item.get("label").and_then(|v| v.as_str()).unwrap_or("");
                let action_id = item.get("action_id").and_then(|v| v.as_str()).unwrap_or("");
                let row_id = format!("{composite_level_key}::{item_id}");

                connection
                    .execute(
                        "INSERT OR REPLACE INTO shell_menu_items (id, level_id, label, action_id) VALUES (?1, ?2, ?3, ?4)",
                        params![row_id, composite_level_key, label, action_id],
                    )
                    .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_active_intent_state(
    state: tauri::State<'_, AiosDbState>,
) -> Result<Value, String> {
    state.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT policy_rules FROM smart_contracts WHERE role_id = 'guest' AND journey_phase_id = 'phase_1' LIMIT 1"
        ).map_err(|e| crate::state_machine::AiosStateError::InvalidData(e.to_string()))?;
        
        let policy_rules_str: String = stmt.query_row([], |row| row.get(0)).unwrap_or_else(|_| "{}".to_string());
        
        let policy_rules: Value = serde_json::from_str(&policy_rules_str).unwrap_or_else(|_| serde_json::json!({}));
        
        Ok(policy_rules)
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resolve_intent_menu(state: tauri::State<'_, AiosDbState>) -> Result<Value, String> {
    state
        .with_connection(|conn| {
            let json_opt: Option<String> = conn
                .query_row(
                    "SELECT json FROM shell_menu_registry_blob WHERE id = 1",
                    [],
                    |row| row.get(0),
                )
                .optional()
                .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;

            let Some(json_str) = json_opt else {
                return Ok(serde_json::json!({}));
            };

            let v: Value =
                serde_json::from_str(&json_str).map_err(|e| AiosStateError::InvalidData(e.to_string()))?;
            Ok(v)
        })
        .map_err(|e| e.to_string())
}
