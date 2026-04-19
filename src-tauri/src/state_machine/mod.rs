mod constants;
mod db;
mod error;
mod migrations;
mod models;
pub mod onboarding;
mod scoring;
mod service;
mod store;

pub use db::AiosDbState;
pub use error::{AiosResult, AiosStateError};
pub use models::{ConversationMessage, OsStateSnapshot, OutcomeSnapshot, VerbosityLevel};
pub use service::{
    get_os_state_snapshot, initialize_database, record_outcome_entry, update_active_intent,
    get_conversation_history, append_conversation_message, upsert_node_contract,
};
pub use onboarding::{OnboardingState, OnboardingIntent, OnboardingPhase};
