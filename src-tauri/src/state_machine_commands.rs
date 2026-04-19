use crate::state_machine::{
    get_os_state_snapshot, record_outcome_entry, update_active_intent, upsert_node_contract,
    AiosDbState, OsStateSnapshot, OutcomeSnapshot, OnboardingState, OnboardingIntent, OnboardingPhase,
};
use std::sync::Mutex;
use tauri::{Emitter, State, Window};

const OS_STATE_CHANGED_EVENT: &str = "os_state_changed";

pub struct OnboardingManager(pub Mutex<OnboardingState>);

#[tauri::command]
pub fn get_os_state(
    state: State<'_, AiosDbState>,
    onboarding: State<'_, OnboardingManager>,
) -> Result<OsStateSnapshot, String> {
    let mut snapshot = get_os_state_snapshot(&state).map_err(|error| error.to_string())?;

    let onboarding_state = onboarding.0.lock().unwrap();
    if onboarding_state.current_phase != OnboardingPhase::Complete {
        snapshot.current_intent = "onboarding".to_string();
        snapshot.status = "active".to_string();
        snapshot.permitted_ui_components = onboarding_state.merged_permitted_components();
        snapshot.active_project_nodes = onboarding_state.active_project_nodes();
    } else {
        snapshot.active_project_nodes = None;
        for extra in &onboarding_state.extra_permitted_components {
            if !snapshot.permitted_ui_components.contains(extra) {
                snapshot.permitted_ui_components.push(extra.clone());
            }
        }
    }

    Ok(snapshot)
}

#[tauri::command]
pub fn process_intent(
    state: State<'_, AiosDbState>,
    onboarding: State<'_, OnboardingManager>,
    window: Window,
    intent: String,
) -> Result<OsStateSnapshot, String> {
    // Try to parse the intent as an OnboardingIntent first
    if let Ok(onboarding_intent) = serde_json::from_str::<OnboardingIntent>(&intent) {
        let mut onboarding_state = onboarding.0.lock().unwrap();
        onboarding_state.transition(onboarding_intent);
        
        let mut snapshot = get_os_state_snapshot(&state).map_err(|error| error.to_string())?;
        if onboarding_state.current_phase != OnboardingPhase::Complete {
            snapshot.current_intent = "onboarding".to_string();
            snapshot.status = "active".to_string();
            snapshot.permitted_ui_components = onboarding_state.merged_permitted_components();
            snapshot.active_project_nodes = onboarding_state.active_project_nodes();
        } else {
            snapshot.active_project_nodes = None;
            for extra in &onboarding_state.extra_permitted_components {
                if !snapshot.permitted_ui_components.contains(extra) {
                    snapshot.permitted_ui_components.push(extra.clone());
                }
            }
        }

        window
            .emit(OS_STATE_CHANGED_EVENT, &snapshot)
            .map_err(|error| error.to_string())?;
        return Ok(snapshot);
    }

    // If not an onboarding intent, fall back to standard intent processing
    let snapshot = update_active_intent(&state, intent).map_err(|error| error.to_string())?;
    window
        .emit(OS_STATE_CHANGED_EVENT, &snapshot)
        .map_err(|error| error.to_string())?;
    Ok(snapshot)
}

#[tauri::command]
pub fn record_outcome(
    state: State<'_, AiosDbState>,
    window: Window,
    intent: String,
    completion_time_ms: i32,
    context_ratio: f32,
) -> Result<OutcomeSnapshot, String> {
    let outcome =
        record_outcome_entry(&state, intent, completion_time_ms, context_ratio).map_err(|error| error.to_string())?;
    let snapshot = get_os_state_snapshot(&state).map_err(|error| error.to_string())?;
    window
        .emit(OS_STATE_CHANGED_EVENT, &snapshot)
        .map_err(|error| error.to_string())?;
    Ok(outcome)
}

/// Lets the Kernel (or a privileged operator script) register / update the NodeContract
/// for a given intent at runtime. Immediately broadcasts the updated snapshot.
///
/// `permitted_ui_components` and `available_skills` are JSON arrays, e.g.
/// `["voice_ptt","chat_input","file_upload"]`
#[tauri::command]
pub fn register_node_contract(
    state: State<'_, AiosDbState>,
    window: Window,
    intent_id: String,
    permitted_ui_components: Vec<String>,
    available_skills: Vec<String>,
) -> Result<OsStateSnapshot, String> {
    upsert_node_contract(&state, intent_id, permitted_ui_components, available_skills)
        .map_err(|error| error.to_string())?;
    let snapshot = get_os_state_snapshot(&state).map_err(|error| error.to_string())?;
    window
        .emit(OS_STATE_CHANGED_EVENT, &snapshot)
        .map_err(|error| error.to_string())?;
    Ok(snapshot)
}
