use crate::state_machine::{AiosDbState, AiosResult};
use rusqlite::{params, Connection};
use serde_json::Value;

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
pub fn resolve_intent_menu(
    _role: String,
    _journey_phase: String,
    _intent: String,
    _state: tauri::State<'_, AiosDbState>,
) -> Result<Value, String> {
    // For now, return an empty object or a basic registry matching the frontend's expected format.
    // The frontend expects Record<ShellMenuId, ShellMenuRegistryEntry>.
    Ok(serde_json::json!({}))
}
