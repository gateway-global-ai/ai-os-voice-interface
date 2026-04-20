use crate::state_machine::{AiosResult, AiosStateError};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum VerbosityLevel {
    Book,
    Paragraph,
    Sentence,
    StartButton,
}

impl VerbosityLevel {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Book => "book",
            Self::Paragraph => "paragraph",
            Self::Sentence => "sentence",
            Self::StartButton => "start_button",
        }
    }

    pub fn from_db(value: &str) -> AiosResult<Self> {
        match value {
            "book" => Ok(Self::Book),
            "paragraph" => Ok(Self::Paragraph),
            "sentence" => Ok(Self::Sentence),
            "start_button" => Ok(Self::StartButton),
            other => Err(AiosStateError::InvalidData(format!(
                "unsupported verbosity level: {other}"
            ))),
        }
    }
}

/// PM tree node (Purpose–Plan–Pressure); mirrored in frontend kernel types.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskNode {
    pub id: String,
    pub title: String,
    pub description: String,
    /// `"pending"` | `"active"` | `"completed"`
    pub status: String,
    pub requires_action: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryNode {
    pub id: String,
    pub category_name: String,
    pub tasks: Vec<TaskNode>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OsStateSnapshot {
    pub current_intent: String,
    pub status: String,
    pub active_context_pointer: String,
    pub current_verbosity_level: VerbosityLevel,
    /// UI components the active NodeContract authorises for this intent.
    /// The frontend must not render any governed component unless its id appears here.
    pub permitted_ui_components: Vec<String>,
    /// Skill slugs the active NodeContract makes available for this intent.
    pub available_skills: Vec<String>,
    /// Kernel-held project tree for PM UI; omitted when absent.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_project_nodes: Option<Vec<CategoryNode>>,
}

/// A row from the `node_contract` table.
#[derive(Debug, Clone)]
pub(crate) struct NodeContractRow {
    pub(crate) permitted_ui_components: Vec<String>,
    pub(crate) available_skills: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OutcomeSnapshot {
    pub intent_category: String,
    pub success_count: i64,
    pub avg_response_time_ms: i64,
    pub avg_context_ratio: f32,
    pub victory_score: f32,
    pub last_executed_timestamp: i64,
    pub current_verbosity_level: VerbosityLevel,
    pub recorded_context_ratio: f32,
}

#[derive(Debug, Clone)]
pub(crate) struct ActiveStateRow {
    pub(crate) current_intent: String,
    pub(crate) status: String,
    pub(crate) active_context_pointer: String,
}

#[derive(Debug, Clone)]
pub(crate) struct UserAptitudeRow {
    pub(crate) success_count: i64,
    pub(crate) avg_response_time_ms: i64,
    pub(crate) avg_context_ratio: f32,
    pub(crate) victory_score: f32,
    pub(crate) last_executed_timestamp: i64,
    pub(crate) current_verbosity_level: VerbosityLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMessage {
    pub message_id: String,
    pub role: String, // "user" | "agent"
    pub text: String,
    pub timestamp_ms: i64,
}
