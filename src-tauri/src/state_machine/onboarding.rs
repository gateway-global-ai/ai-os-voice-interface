use serde::{Deserialize, Serialize};

use crate::state_machine::models::{CategoryNode, TaskNode};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum OnboardingPhase {
    Landing,
    ModeSelect,
    CommanderName,
    ReturningPhone,
    ReturningOtp,
    PlanetOverview,
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum OnboardingIntent {
    SubmitArrivalType(String),
    SubmitInterfaceMode(String),
    SubmitCommanderName(String),
    SubmitPhoneNumber(String),
    SubmitOTP(String),
    CompleteOnboarding,
    ExecuteTaskAction { task_id: String },
    /// Viral invite loop — sent from ScreenInvite before planet_overview.
    /// The actual SMS is dispatched by the separate `dispatch_invite` command.
    SendInvite { phone: String },
    /// Go back one step — currently handles ReturningOtp → ReturningPhone.
    GoBack,
}

#[derive(Debug, Clone)]
pub struct OnboardingState {
    pub current_phase: OnboardingPhase,
    pub arrival_type: Option<String>,
    pub interface_mode: Option<String>,
    pub commander_name: Option<String>,
    pub phone_number: Option<String>,
    /// Phone number the Commander sent an early-access invite to.
    pub invited_phone: Option<String>,
    /// Extra UI component ids merged into the snapshot while onboarding (e.g. workspace gate).
    pub extra_permitted_components: Vec<String>,
}

impl OnboardingState {
    pub fn new() -> Self {
        Self {
            current_phase: OnboardingPhase::Landing,
            arrival_type: None,
            interface_mode: None,
            commander_name: None,
            phone_number: None,
            invited_phone: None,
            extra_permitted_components: Vec::new(),
        }
    }

    pub fn transition(&mut self, intent: OnboardingIntent) {
        match (self.current_phase.clone(), intent) {
            (OnboardingPhase::Landing, OnboardingIntent::SubmitArrivalType(arrival_type)) => {
                self.arrival_type = Some(arrival_type.clone());
                if arrival_type == "returning" {
                    self.current_phase = OnboardingPhase::ReturningPhone;
                } else {
                    self.current_phase = OnboardingPhase::ModeSelect;
                }
            }
            (OnboardingPhase::ModeSelect, OnboardingIntent::SubmitInterfaceMode(mode)) => {
                self.interface_mode = Some(mode);
                self.current_phase = OnboardingPhase::CommanderName;
            }
            (OnboardingPhase::CommanderName, OnboardingIntent::SubmitCommanderName(name)) => {
                self.commander_name = Some(name);
                // New arrivals: verify phone + OTP before planet overview (same surfaces as returning).
                self.current_phase = OnboardingPhase::ReturningPhone;
            }
            (OnboardingPhase::ReturningPhone, OnboardingIntent::SubmitPhoneNumber(phone)) => {
                self.phone_number = Some(phone);
                self.current_phase = OnboardingPhase::ReturningOtp;
            }
            (OnboardingPhase::ReturningOtp, OnboardingIntent::SubmitOTP(otp)) => {
                // Six-digit code typed here, or "__checkme_external__" after finishing on 123CheckMe in the browser.
                let checkme_external = "__checkme_external__";
                let ok = otp == checkme_external
                    || (otp.len() == 6 && otp.chars().all(|c| c.is_ascii_digit()));
                if ok {
                    self.current_phase = OnboardingPhase::PlanetOverview;
                }
            }
            // Invite can arrive while the kernel is already in PlanetOverview (the screen is a
            // client-side injected step); just record the invited phone and stay in the same phase.
            (OnboardingPhase::PlanetOverview, OnboardingIntent::SendInvite { phone }) => {
                self.invited_phone = Some(phone);
                // Phase stays at PlanetOverview — the frontend advances injectedStep to 'done'.
            }
            // Back navigation: OTP → Phone re-entry.
            (OnboardingPhase::ReturningOtp, OnboardingIntent::GoBack) => {
                self.current_phase = OnboardingPhase::ReturningPhone;
            }
            (OnboardingPhase::PlanetOverview, OnboardingIntent::CompleteOnboarding) => {
                self.current_phase = OnboardingPhase::Complete;
            }
            (OnboardingPhase::PlanetOverview, OnboardingIntent::ExecuteTaskAction { task_id }) => {
                if task_id == "config_workspace" {
                    let tag = "workspace_settings_overlay".to_string();
                    if !self.extra_permitted_components.contains(&tag) {
                        self.extra_permitted_components.push(tag);
                    }
                }
            }
            _ => {
                // Invalid transition or unexpected intent for the current phase.
                // We ignore it to prevent invalid state changes.
            }
        }
    }

    /// Base onboarding surfaces plus any injected overlays (workspace, etc.).
    pub fn merged_permitted_components(&self) -> Vec<String> {
        let mut v = self.permitted_ui_components();
        v.extend(self.extra_permitted_components.iter().cloned());
        v
    }

    /// Demo PM tree while on Planet Overview; `None` elsewhere.
    pub fn active_project_nodes(&self) -> Option<Vec<CategoryNode>> {
        if self.current_phase != OnboardingPhase::PlanetOverview {
            return None;
        }
        Some(planet_overview_demo_nodes())
    }

    pub fn permitted_ui_components(&self) -> Vec<String> {
        match self.current_phase {
            OnboardingPhase::Landing => vec!["onboarding_landing".to_string()],
            OnboardingPhase::ModeSelect => vec!["onboarding_mode_select".to_string()],
            OnboardingPhase::CommanderName => vec!["onboarding_commander_name".to_string()],
            OnboardingPhase::ReturningPhone => vec!["onboarding_returning_phone".to_string()],
            OnboardingPhase::ReturningOtp => vec!["onboarding_returning_otp".to_string()],
            OnboardingPhase::PlanetOverview => vec!["onboarding_planet_overview".to_string()],
            OnboardingPhase::Complete => vec!["onboarding_complete".to_string()],
        }
    }
}

#[cfg(test)]
mod intent_json_tests {
    use super::*;

    #[test]
    fn submit_arrival_type_matches_frontend_json() {
        let s = r#"{"type":"SubmitArrivalType","payload":"new"}"#;
        let parsed: OnboardingIntent = serde_json::from_str(s).expect("parse");
        assert!(matches!(parsed, OnboardingIntent::SubmitArrivalType(ref a) if a == "new"));
    }
}

fn planet_overview_demo_nodes() -> Vec<CategoryNode> {
    vec![
        CategoryNode {
            id: "lessons".to_string(),
            category_name: "Lessons".to_string(),
            tasks: vec![
                TaskNode {
                    id: "intro".to_string(),
                    title: "Introduction to AI OS".to_string(),
                    description: "A quick tour of what AI OS is.".to_string(),
                    status: "pending".to_string(),
                    requires_action: false,
                },
            ],
        },
        CategoryNode {
            id: "onboarding_tasks".to_string(),
            category_name: "Onboarding Tasks".to_string(),
            tasks: vec![TaskNode {
                id: "config_workspace".to_string(),
                title: "Configure Google Workspace".to_string(),
                description: "Connect Google Workspace for calendar, email, and drive.".to_string(),
                status: "pending".to_string(),
                requires_action: true,
            }],
        },
    ]
}
