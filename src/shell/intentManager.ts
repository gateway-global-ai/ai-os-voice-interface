/**
 * Intent State Machine — data-driven routing architecture for AI OS.
 *
 * System intents describe what the platform is trying to accomplish at each
 * stage of the funnel. User intents describe the path a user is on.
 * Desktop sub-paths map directly to the authenticated shell menu surface areas.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------------------------
// System Intents
// ---------------------------------------------------------------------------

export enum SystemIntent {
  /**
   * "Vibe Coders are not broken, the vibe coding systems are."
   * Lead with empathy and reframe the problem to earn trust.
   */
  MARKET_POSITIONING = 'MARKET_POSITIONING',

  /**
   * Creating Fast Time To Value for the User.
   * Reduce every step between arrival and first meaningful outcome.
   */
  FAST_TIME_TO_VALUE = 'FAST_TIME_TO_VALUE',

  /**
   * Triggering A Sales Funnel.
   * Guide the visitor toward account creation and subscription.
   */
  SALES_FUNNEL = 'SALES_FUNNEL',

  /**
   * Onboard A Verified User through a frictionless experience.
   * Phone + OTP identity gate then immediate workspace access.
   */
  FRICTIONLESS_ONBOARDING = 'FRICTIONLESS_ONBOARDING',

  /**
   * Demonstrate System Capabilities And Features.
   * Show the platform in action before asking for commitment.
   */
  DEMONSTRATE_CAPABILITIES = 'DEMONSTRATE_CAPABILITIES',
}

// ---------------------------------------------------------------------------
// User Intents (The User Paths)
// ---------------------------------------------------------------------------

export enum UserIntent {
  /**
   * Searching for value, looking at design, evaluating the community.
   * The user has not yet committed — meet them with MARKET_POSITIONING.
   */
  VIBE_CHECK = 'VIBE_CHECK',

  /**
   * Creates account, verifies identity, immediate time to value.
   * Triggers the FRICTIONLESS_ONBOARDING + FAST_TIME_TO_VALUE system intents.
   */
  TAKE_FIRST_STEP = 'TAKE_FIRST_STEP',

  /**
   * Returning to log in to learn, code, or network.
   * Triggers the authenticated desktop shell.
   */
  ACCESS_SYSTEM_DESKTOP = 'ACCESS_SYSTEM_DESKTOP',

  /**
   * Viewing/editing profile, billing, subscription management.
   */
  ACCESS_ACCOUNT = 'ACCESS_ACCOUNT',

  /**
   * Control background, voice settings, etc.
   */
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS',
}

// ---------------------------------------------------------------------------
// Desktop Sub-Paths (authenticated shell surface areas)
// ---------------------------------------------------------------------------

export enum DesktopSubPath {
  /** Podcasts, Courses, Tutorials. */
  LEARNING = 'LEARNING',

  /** Project and Task Manager, Coding Work Space. */
  CODING = 'CODING',

  /** Comment on community message board. */
  NETWORKING = 'NETWORKING',

  /** Add knowledge, review core knowledge, manage permissions. */
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',

  /** Viewing/edit profile, billing, subscription management. */
  ACCESS_ACCOUNT = 'ACCESS_ACCOUNT',

  /** Control background, voice settings, etc. */
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS',
}

// ---------------------------------------------------------------------------
// Shell menu action → Desktop sub-path mapping
// ---------------------------------------------------------------------------

/**
 * Maps every shell menu action_id to its governing DesktopSubPath.
 * Used by the registry filter to strip actions that fall outside the
 * currently active sub-path or authentication tier.
 */
export const ACTION_ID_TO_DESKTOP_SUB_PATH: Readonly<Record<string, DesktopSubPath>> = {
  // LEARNING
  open_podcasts: DesktopSubPath.LEARNING,

  // CODING
  open_coding_agent: DesktopSubPath.CODING,

  // KNOWLEDGE_BASE
  open_knowledge: DesktopSubPath.KNOWLEDGE_BASE,
  open_user_storage: DesktopSubPath.KNOWLEDGE_BASE,
  open_workspace: DesktopSubPath.KNOWLEDGE_BASE,

  // SYSTEM_SETTINGS
  open_menu_voice_control: DesktopSubPath.SYSTEM_SETTINGS,
  set_voice_route_gemini: DesktopSubPath.SYSTEM_SETTINGS,
  set_voice_route_voicebox: DesktopSubPath.SYSTEM_SETTINGS,
  set_voice_route_browser: DesktopSubPath.SYSTEM_SETTINGS,
  open_menu_voice_box: DesktopSubPath.SYSTEM_SETTINGS,
  open_voicebox_profiles: DesktopSubPath.SYSTEM_SETTINGS,
  open_voicebox_create: DesktopSubPath.SYSTEM_SETTINGS,
  open_voicebox_record: DesktopSubPath.SYSTEM_SETTINGS,
  open_voicebox_upload: DesktopSubPath.SYSTEM_SETTINGS,
  open_menu_appearance: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_set_dark_mode: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_set_light_mode: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_open_overlay_color: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_open_overlay_opacity: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_open_overlay_width: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_open_canvas_padding: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_reset_defaults: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_set_background_live_effects: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_open_custom_background: DesktopSubPath.SYSTEM_SETTINGS,
  appearance_open_background_library: DesktopSubPath.SYSTEM_SETTINGS,
  open_system_scripts: DesktopSubPath.SYSTEM_SETTINGS,
  open_disc_settings: DesktopSubPath.SYSTEM_SETTINGS,
  open_menu_agent_identity: DesktopSubPath.SYSTEM_SETTINGS,
  agent_identity_edit_name: DesktopSubPath.SYSTEM_SETTINGS,
  agent_identity_edit_company: DesktopSubPath.SYSTEM_SETTINGS,
  agent_identity_edit_role: DesktopSubPath.SYSTEM_SETTINGS,
  agent_identity_edit_agent_intent: DesktopSubPath.SYSTEM_SETTINGS,
  agent_identity_edit_user_intent: DesktopSubPath.SYSTEM_SETTINGS,
  agent_identity_edit_desired_outcome: DesktopSubPath.SYSTEM_SETTINGS,
  open_arch_protocol_reference: DesktopSubPath.SYSTEM_SETTINGS,

  // ACCESS_ACCOUNT
  open_system_profile: DesktopSubPath.ACCESS_ACCOUNT,
  system_logout: DesktopSubPath.ACCESS_ACCOUNT,
  system_quit_app: DesktopSubPath.ACCESS_ACCOUNT,

  // Transparency is cross-cutting — map to KNOWLEDGE_BASE as closest fit
  open_transparency: DesktopSubPath.KNOWLEDGE_BASE,
  open_api_health: DesktopSubPath.KNOWLEDGE_BASE,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when a user intent requires an authenticated session. */
export function requiresAuth(intent: UserIntent): boolean {
  return intent === UserIntent.ACCESS_SYSTEM_DESKTOP || intent === UserIntent.ACCESS_ACCOUNT;
}

/** Returns the system intent that should be active for a given user intent. */
export function systemIntentForUserIntent(intent: UserIntent): SystemIntent {
  switch (intent) {
    case UserIntent.VIBE_CHECK:
      return SystemIntent.MARKET_POSITIONING;
    case UserIntent.TAKE_FIRST_STEP:
      return SystemIntent.FRICTIONLESS_ONBOARDING;
    case UserIntent.ACCESS_SYSTEM_DESKTOP:
      return SystemIntent.FAST_TIME_TO_VALUE;
    case UserIntent.ACCESS_ACCOUNT:
      return SystemIntent.FAST_TIME_TO_VALUE;
    case UserIntent.SYSTEM_SETTINGS:
      return SystemIntent.FAST_TIME_TO_VALUE;
  }
}
