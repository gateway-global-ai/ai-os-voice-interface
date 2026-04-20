pub const DEFAULT_INTENT_CATEGORY: &str = "global";
pub const DEFAULT_INTENT: &str = "idle";
pub const DEFAULT_STATUS: &str = "idle";
pub const DEFAULT_CONTEXT_POINTER: &str = "root";

pub const CURRENT_SCHEMA_VERSION: i32 = 5;

pub const MIN_CONTEXT_RATIO: f32 = 0.05;
pub const VICTORY_SCORE_TIME_SCALE_MS: f32 = 1_000.0;

pub const THRESHOLD_START_BUTTON: f32 = 85.0;
pub const THRESHOLD_SENTENCE: f32 = 50.0;
pub const THRESHOLD_PARAGRAPH: f32 = 20.0;

pub const ATROPHY_GRACE_PERIOD_DAYS: i64 = 30;
pub const ATROPHY_INTERVAL_DAYS: i64 = 30;
pub const ATROPHY_DECAY_FACTOR: f32 = 0.65;
