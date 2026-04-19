use crate::state_machine::constants::{
    ATROPHY_DECAY_FACTOR, ATROPHY_GRACE_PERIOD_DAYS, ATROPHY_INTERVAL_DAYS,
    MIN_CONTEXT_RATIO, THRESHOLD_PARAGRAPH, THRESHOLD_SENTENCE, THRESHOLD_START_BUTTON,
    VICTORY_SCORE_TIME_SCALE_MS,
};
use crate::state_machine::{AiosResult, AiosStateError, VerbosityLevel};
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn calculate_victory_score(
    success_count: i64,
    avg_response_time_ms: i64,
    context_ratio: f32,
) -> f32 {
    let effective_context_ratio = context_ratio.max(MIN_CONTEXT_RATIO);
    let effective_time_ms = avg_response_time_ms.max(1) as f32;
    let successes = success_count.max(1) as f32;

    (successes * VICTORY_SCORE_TIME_SCALE_MS) / (effective_time_ms * effective_context_ratio)
}

pub(crate) fn apply_atrophy_decay(
    victory_score: f32,
    last_executed_timestamp: i64,
    current_timestamp: i64,
) -> f32 {
    if victory_score <= 0.0
        || last_executed_timestamp <= 0
        || current_timestamp <= last_executed_timestamp
    {
        return victory_score.max(0.0);
    }

    let inactivity_days = (current_timestamp - last_executed_timestamp) / 86_400;

    if inactivity_days <= ATROPHY_GRACE_PERIOD_DAYS {
        return victory_score;
    }

    let decay_intervals =
        ((inactivity_days - ATROPHY_GRACE_PERIOD_DAYS) / ATROPHY_INTERVAL_DAYS) + 1;

    victory_score * ATROPHY_DECAY_FACTOR.powi(decay_intervals as i32)
}

pub(crate) fn derive_verbosity_level(victory_score: f32) -> VerbosityLevel {
    if victory_score >= THRESHOLD_START_BUTTON {
        VerbosityLevel::StartButton
    } else if victory_score >= THRESHOLD_SENTENCE {
        VerbosityLevel::Sentence
    } else if victory_score >= THRESHOLD_PARAGRAPH {
        VerbosityLevel::Paragraph
    } else {
        VerbosityLevel::Book
    }
}

pub(crate) fn normalize_intent(value: &str) -> AiosResult<String> {
    let normalized = value.trim();

    if normalized.is_empty() {
        return Err(AiosStateError::InvalidInput(
            "intent must not be empty".to_string(),
        ));
    }

    Ok(normalized.to_string())
}

pub(crate) fn current_unix_timestamp() -> AiosResult<i64> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| AiosStateError::InvalidData(format!("system clock error: {error}")))?;

    Ok(duration.as_secs() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn victory_score_reaches_start_button_for_fast_low_context_mastery() {
        let victory_score = calculate_victory_score(12, 1_500, 0.08);

        assert!(matches!(
            derive_verbosity_level(victory_score),
            VerbosityLevel::StartButton
        ));
    }

    #[test]
    fn victory_score_stays_book_for_slow_high_context_use() {
        let victory_score = calculate_victory_score(2, 60_000, 0.95);

        assert!(matches!(
            derive_verbosity_level(victory_score),
            VerbosityLevel::Book
        ));
    }

    #[test]
    fn victory_score_maps_into_paragraph_band() {
        let victory_score = calculate_victory_score(3, 10_000, 0.15);

        assert!(matches!(
            derive_verbosity_level(victory_score),
            VerbosityLevel::Paragraph
        ));
    }

    #[test]
    fn victory_score_maps_into_sentence_band() {
        let victory_score = calculate_victory_score(8, 8_000, 0.20);

        assert!(matches!(
            derive_verbosity_level(victory_score),
            VerbosityLevel::Sentence
        ));
    }

    #[test]
    fn atrophy_decay_reduces_mastery_after_grace_period() {
        let decayed_score = apply_atrophy_decay(100.0, 0, 0);
        assert_eq!(decayed_score, 100.0);

        let decayed_after_inactivity = apply_atrophy_decay(100.0, 1, 86_400 * 61);
        assert!(decayed_after_inactivity < 100.0);
    }
}
