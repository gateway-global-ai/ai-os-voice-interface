import type { ShellMenuId } from './shellMenuContract';
import type { ShellMenuRegistryEntry } from './shellMenuStoreTypes';
import { DesktopSubPath } from './intentManager';

/**
 * Actions that require an authenticated (OTP-verified) session.
 *
 * Organized by Desktop Sub-Path:
 *   SYSTEM_SETTINGS  — voice runtime, scripts editor, DISC, appearance, agent identity
 *   ACCESS_ACCOUNT   — profile, logout
 *   CODING           — coding agent
 * LEARNING and KNOWLEDGE_BASE items are partially visible to guests
 * (podcasts are public; knowledge requires auth).
 */
export const AUTHENTICATED_ONLY_SHELL_ACTION_IDS: ReadonlySet<string> = new Set([
  // SYSTEM_SETTINGS sub-path
  'open_menu_voice_control',
  'open_system_scripts',
  'open_disc_settings',
  'open_menu_agent_identity',
  'agent_identity_edit_name',
  'agent_identity_edit_company',
  'agent_identity_edit_role',
  'agent_identity_edit_agent_intent',
  'agent_identity_edit_user_intent',
  'agent_identity_edit_desired_outcome',
  'open_arch_protocol_reference',
  // ACCESS_ACCOUNT sub-path
  'open_system_profile',
  'system_logout',
  // CODING sub-path
  'open_coding_agent',
  // KNOWLEDGE_BASE sub-path (requires auth)
  'open_knowledge',
  'open_user_storage',
  'open_workspace',
]);

/**
 * Maps each registered menu to its governing Desktop Sub-Path.
 * Used for display filtering and intent-aware surface routing.
 */
export const SHELL_MENU_DESKTOP_SUB_PATH: Readonly<Record<ShellMenuId, DesktopSubPath | null>> = {
  'shell-header-system': null,            // top-level launcher — sub-path depends on item selected
  'shell-footer-user': DesktopSubPath.KNOWLEDGE_BASE,
  'system-controls': DesktopSubPath.ACCESS_ACCOUNT,
  'guest-entry': null,
  'voice-control': DesktopSubPath.SYSTEM_SETTINGS,
  'voice-box': DesktopSubPath.SYSTEM_SETTINGS,
  appearance: DesktopSubPath.SYSTEM_SETTINGS,
  'agent-identity': DesktopSubPath.SYSTEM_SETTINGS,
};

export function filterShellMenuRegistryForAuth(
  registry: Record<ShellMenuId, ShellMenuRegistryEntry>,
  auth: 'guest' | 'authenticated',
): Record<ShellMenuId, ShellMenuRegistryEntry> {
  if (auth === 'authenticated') {
    const { 'guest-entry': _removed, ...rest } = registry;
    return rest as Record<ShellMenuId, ShellMenuRegistryEntry>;
  }
  const next: Record<ShellMenuId, ShellMenuRegistryEntry> = { ...registry };
  for (const id of Object.keys(next) as ShellMenuId[]) {
    const entry = next[id];
    if (!entry?.record?.levels) continue;
    next[id] = {
      ...entry,
      record: {
        ...entry.record,
        levels: entry.record.levels
          .map((level) => ({
            ...level,
            items: level.items.filter(
              (item) => !AUTHENTICATED_ONLY_SHELL_ACTION_IDS.has(item.action_id),
            ),
          }))
          .filter((level) => level.items.length > 0),
      },
    };
  }
  return next;
}

/** Phone-first entry for guests — opened from power / start; items are guest-safe action_ids. */
export const GUEST_ENTRY_MENU: ShellMenuRegistryEntry = {
  menu_id: 'guest-entry',
  menu_zone: 'header_system',
  permission_class: 'shell_system',
  data_source_ref: 'shell.menu.guest_entry.v1',
  parent_menu_id: null,
  launched_from_action_id: null,
  launch_mode: 'replace_active',
  record: {
    menu_id: 'guest-entry',
    menu_zone: 'header_system',
    content_type: 'system',
    level_count: 1,
    levels: [
      {
        level_id: 'guest-shell-entry',
        level_label: 'Shell entry',
        items: [
          {
            item_id: 'guest-verify-phone',
            label: 'Verify with phone',
            description:
              'SMS code unlocks governed workspace, appearance, agent identity, DISC, and architecture reference.',
            action_id: 'guest_verify_phone',
            icon: 'profile',
          },
          {
            item_id: 'guest-explore-topics',
            label: 'Explore topics',
            description: 'Choose voice or chat, then continue the community join path before verifying.',
            action_id: 'guest_explore_topics',
            icon: 'podcasts',
          },
          {
            item_id: 'guest-display-name',
            label: 'What should we call you?',
            description: 'Optional nickname saved on this device only — helps the host greet you before phone verify.',
            action_id: 'guest_open_display_name',
            icon: 'profile',
          },
          {
            item_id: 'guest-public-routes',
            label: 'Public shell routes',
            description: 'Podcasts, transparency, and diagnostics (when enabled) without a verified session.',
            action_id: 'guest_open_public_shell_menu',
            icon: 'system',
          },
        ],
      },
    ],
    template_family: 'list',
    permission_class: 'shell_system',
    data_source_ref: 'shell.menu.guest_entry.v1',
    selection_behavior: 'open_surface',
    disclosure_requirements: ['header_attached', 'shell_owned', 'deterministic_levels', 'intent_first'],
  },
};

export const SHELL_HEADER_SYSTEM_MENU: ShellMenuRegistryEntry = {
  menu_id: 'shell-header-system',
  menu_zone: 'header_system',
  permission_class: 'shell_system',
  data_source_ref: 'shell.menu.header.system.v3',
  parent_menu_id: null,
  launched_from_action_id: null,
  launch_mode: 'replace_active',
  record: {
    menu_id: 'shell-header-system',
    menu_zone: 'header_system',
    content_type: 'system',
    level_count: 2,
    levels: [
      {
        level_id: 'shell-control-plane',
        level_label: 'Shell control plane',
        items: [
          {
            // SYSTEM_SETTINGS sub-path — auth required
            item_id: 'shell-open-voice-control',
            label: 'Voice control',
            description: 'Route speech and open governed voice profile management.',
            action_id: 'open_menu_voice_control',
            icon: 'voice',
          },
          {
            // SYSTEM_SETTINGS sub-path — auth required
            item_id: 'shell-open-appearance',
            label: 'Appearance',
            description: 'Adjust shell appearance through the governed shell menu.',
            action_id: 'open_menu_appearance',
            icon: 'appearance',
          },
          {
            // LEARNING sub-path — publicly accessible
            item_id: 'shell-open-podcasts',
            label: 'Podcasts',
            description: 'Open the narrated research library from the shell-owned route.',
            action_id: 'open_podcasts',
            icon: 'podcasts',
          },
          {
            // CODING sub-path — auth required
            item_id: 'shell-open-coding-agent',
            label: 'Coding agent',
            description: 'Create and manage Rust MCP projects, then open the MCP Inspector.',
            action_id: 'open_coding_agent',
            icon: 'disc',
          },
        ],
      },
      {
        level_id: 'governed-configuration',
        level_label: 'Governed Configuration',
        items: [
          {
            // SYSTEM_SETTINGS sub-path — auth required
            item_id: 'shell-open-agent-identity',
            label: 'Agent Identity',
            description: 'Adjust core agent identity, intent, and desired outcome through the governed shell menu.',
            action_id: 'open_menu_agent_identity',
            icon: 'system',
          },
          {
            // KNOWLEDGE_BASE sub-path — auth required
            item_id: 'shell-open-transparency',
            label: 'Transparency',
            description: 'Review current route, prompts, and disclosure state.',
            action_id: 'open_transparency',
            icon: 'transparency',
          },
          {
            // KNOWLEDGE_BASE sub-path — auth required
            item_id: 'shell-open-api-health',
            label: 'API health',
            description: 'Inspect provider and runtime status.',
            action_id: 'open_api_health',
            icon: 'diagnostics',
          },
        ],
      },
    ],
    template_family: 'list',
    permission_class: 'shell_system',
    data_source_ref: 'shell.menu.header.system.v3',
    selection_behavior: 'open_surface',
    disclosure_requirements: [
      'header_attached',
      'shell_owned',
      'deterministic_levels',
      'intent_first',
    ],
  },
};

export const SHELL_FOOTER_USER_MENU: ShellMenuRegistryEntry = {
  menu_id: 'shell-footer-user',
  menu_zone: 'footer_user',
  permission_class: 'user_surface',
  data_source_ref: 'shell.menu.footer.user.v3',
  parent_menu_id: null,
  launched_from_action_id: null,
  launch_mode: 'replace_active',
  record: {
    menu_id: 'shell-footer-user',
    menu_zone: 'footer_user',
    content_type: 'workspace',
    level_count: 2,
    levels: [
      {
        level_id: 'storage-and-identity',
        level_label: 'Storage and identity',
        items: [
          {
            // KNOWLEDGE_BASE sub-path — auth required
            item_id: 'user-storage',
            label: 'My storage',
            description: 'Open the user-owned local and connected storage surface.',
            action_id: 'open_user_storage',
            icon: 'storage',
          },
          {
            // KNOWLEDGE_BASE sub-path — auth required
            item_id: 'workspace-hub',
            label: 'Google Workspace',
            description: 'Open the governed Workspace hub from the footer-owned user lane.',
            action_id: 'open_workspace',
            icon: 'workspace',
          },
        ],
      },
      {
        level_id: 'context-and-disclosure',
        level_label: 'Context and disclosure',
        items: [
          {
            // KNOWLEDGE_BASE sub-path — auth required
            item_id: 'knowledge-library',
            label: 'Knowledge',
            description: 'Open session knowledge inputs and governed context artifacts.',
            action_id: 'open_knowledge',
            icon: 'knowledge',
          },
          {
            // KNOWLEDGE_BASE sub-path — auth required
            item_id: 'transparency',
            label: 'Transparency',
            description: 'Review current route, prompts, and disclosure state.',
            action_id: 'open_transparency',
            icon: 'transparency',
          },
        ],
      },
    ],
    template_family: 'thumbnail',
    permission_class: 'user_surface',
    data_source_ref: 'shell.menu.footer.user.v3',
    selection_behavior: 'open_surface',
    disclosure_requirements: ['footer_secondary', 'user_focused'],
  },
};

export const SYSTEM_CONTROLS_MENU: ShellMenuRegistryEntry = {
  menu_id: 'system-controls',
  menu_zone: 'header_system',
  permission_class: 'shell_system',
  data_source_ref: 'shell.menu.system.controls.v1',
  parent_menu_id: null,
  launched_from_action_id: null,
  launch_mode: 'replace_active',
  record: {
    menu_id: 'system-controls',
    menu_zone: 'header_system',
    content_type: 'settings',
    level_count: 2,
    levels: [
      {
        level_id: 'runtime-and-identity',
        level_label: 'Runtime and identity',
        items: [
          {
            // SYSTEM_SETTINGS sub-path — auth required
            item_id: 'system-controls-voice-runtime',
            label: 'Voice runtime',
            description: 'Review the active voice route and open governed voice controls.',
            action_id: 'open_menu_voice_control',
            icon: 'voice',
          },
          {
            // ACCESS_ACCOUNT sub-path — auth required
            item_id: 'system-controls-profile',
            label: 'Profile',
            description: 'Edit the signed-in account profile inside the shell menu pane.',
            action_id: 'open_system_profile',
            icon: 'profile',
            detail_surface: 'system.profile.v1',
          },
          {
            // SYSTEM_SETTINGS sub-path — auth required
            item_id: 'system-controls-scripts',
            label: 'Scripts',
            description: 'Edit narration and voice script overrides inside the shell menu pane.',
            action_id: 'open_system_scripts',
            icon: 'system',
            detail_surface: 'system.scripts.v1',
          },
        ],
      },
      {
        level_id: 'session-actions',
        level_label: 'Session actions',
        items: [
          {
            // ACCESS_ACCOUNT sub-path — auth required
            item_id: 'system-controls-logout',
            label: 'Log out',
            description: 'End the signed-in session when account access is available.',
            action_id: 'system_logout',
            icon: 'system',
          },
          {
            // SYSTEM_SETTINGS sub-path
            item_id: 'system-controls-quit',
            label: 'Quit app',
            description: 'Close the current AI OS shell window.',
            action_id: 'system_quit_app',
            icon: 'system',
          },
        ],
      },
    ],
    template_family: 'list',
    permission_class: 'shell_system',
    data_source_ref: 'shell.menu.system.controls.v1',
    selection_behavior: 'open_surface',
    disclosure_requirements: [
      'header_attached',
      'shell_owned',
      'deterministic_levels',
      'intent_first',
    ],
    detail_surfaces: [
      {
        surface_id: 'system.profile.v1',
        title: 'Profile',
        description: 'Edit the current signed-in identity inside the standard shell menu pane.',
        render_mode: 'level_2_detail',
      },
      {
        surface_id: 'system.scripts.v1',
        title: 'Scripts',
        description: 'Review narration and script overrides inside the standard shell menu pane.',
        render_mode: 'level_2_detail',
      },
    ],
  },
};

export const VOICE_CONTROL_MENU: ShellMenuRegistryEntry = {
  menu_id: 'voice-control',
  menu_zone: 'voice_control',
  permission_class: 'voice_route_control',
  data_source_ref: 'shell.menu.voice_control.v1',
  parent_menu_id: 'shell-header-system',
  launched_from_action_id: 'open_menu_voice_control',
  launch_mode: 'push_child',
  record: {
    menu_id: 'voice-control',
    menu_zone: 'voice_control',
    content_type: 'settings',
    level_count: 2,
    levels: [
      {
        level_id: 'voice-route',
        level_label: 'Voice route',
        items: [
          {
            item_id: 'voice-route-gemini',
            label: 'Gemini Voice',
            description: 'Cloud voice route with the most polished response quality.',
            action_id: 'set_voice_route_gemini',
            icon: 'voice',
          },
          {
            item_id: 'voice-route-voicebox',
            label: 'Voice Box',
            description: 'Local sovereign voice cloning route that stays on operator hardware.',
            action_id: 'set_voice_route_voicebox',
            icon: 'voice',
          },
          {
            item_id: 'voice-route-browser',
            label: 'Browser Voice',
            description: 'Fallback system voice with no extra setup required.',
            action_id: 'set_voice_route_browser',
            icon: 'voice',
          },
        ],
      },
      {
        level_id: 'voice-profiles',
        level_label: 'Voice profiles',
        items: [
          {
            item_id: 'voice-profiles-open-voicebox',
            label: 'Voice Box',
            description: 'Open the governed Voice Box menu for viewing profiles, creating profiles, recording voice, and uploading archives.',
            action_id: 'open_menu_voice_box',
            icon: 'profile',
          },
        ],
      },
    ],
    template_family: 'list',
    permission_class: 'voice_route_control',
    data_source_ref: 'shell.menu.voice_control.v1',
    selection_behavior: 'open_surface',
    disclosure_requirements: [
      'shell_owned',
      'deterministic_levels',
      'intent_first',
      'top_aligned',
    ],
  },
};

export const VOICE_BOX_MENU: ShellMenuRegistryEntry = {
  menu_id: 'voice-box',
  menu_zone: 'voice_box',
  permission_class: 'voice_profile_management',
  data_source_ref: 'shell.menu.voice_box.v1',
  parent_menu_id: 'voice-control',
  launched_from_action_id: 'open_menu_voice_box',
  launch_mode: 'push_child',
  record: {
    menu_id: 'voice-box',
    menu_zone: 'voice_box',
    content_type: 'settings',
    level_count: 1,
    levels: [
      {
        level_id: 'voice-box',
        level_label: 'Voice Box',
        items: [
          {
            item_id: 'voicebox-view-profiles',
            label: 'View Profiles',
            description: 'Inspect installed local voices and activate the current speaker.',
            action_id: 'open_voicebox_profiles',
            icon: 'profile',
          },
          {
            item_id: 'voicebox-create-profile',
            label: 'Create Profile',
            description: 'Start a new local voice identity before recording any samples.',
            action_id: 'open_voicebox_create',
            icon: 'profile',
          },
          {
            item_id: 'voicebox-record-voice',
            label: 'Record Voice',
            description: 'Train or improve a profile by reading the guided prompt aloud.',
            action_id: 'open_voicebox_record',
            icon: 'voice',
            detail_surface: 'voicebox.record.capture.v1',
          },
          {
            item_id: 'voicebox-upload-profile',
            label: 'Upload Profile',
            description: 'Install an existing .voicebox.zip archive into the local runtime.',
            action_id: 'open_voicebox_upload',
            icon: 'voice',
          },
        ],
      },
    ],
    template_family: 'list',
    permission_class: 'voice_profile_management',
    data_source_ref: 'shell.menu.voice_box.v1',
    selection_behavior: 'open_surface',
    disclosure_requirements: [
      'shell_owned',
      'deterministic_levels',
      'intent_first',
      'top_aligned',
    ],
    detail_surfaces: [
      {
        surface_id: 'voicebox.record.capture.v1',
        title: 'Record Voice',
        description: 'Capture governed voice samples inside the standard shell menu pane.',
        render_mode: 'level_2_detail',
        requires_ptt_binding: true,
      },
    ],
  },
};

export const APPEARANCE_MENU: ShellMenuRegistryEntry = {
  menu_id: 'appearance',
  menu_zone: 'appearance',
  permission_class: 'appearance_customization',
  data_source_ref: 'shell.menu.appearance.v1',
  parent_menu_id: 'shell-header-system',
  launched_from_action_id: 'open_menu_appearance',
  launch_mode: 'push_child',
  record: {
    menu_id: 'appearance',
    menu_zone: 'appearance',
    content_type: 'settings',
    level_count: 4,
    levels: [
      {
        level_id: 'appearance-color-scheme',
        level_label: 'Color Scheme',
        items: [
          {
            item_id: 'appearance-dark-mode',
            label: 'Dark mode',
            description: 'Apply the governed dark shell color scheme.',
            action_id: 'appearance_set_dark_mode',
            icon: 'appearance',
          },
          {
            item_id: 'appearance-light-mode',
            label: 'Light mode',
            description: 'Apply the governed light shell color scheme.',
            action_id: 'appearance_set_light_mode',
            icon: 'appearance',
          },
        ],
      },
      {
        level_id: 'appearance-overlay-tint',
        level_label: 'Overlay Tint',
        items: [
          {
            item_id: 'appearance-overlay-color',
            label: 'Overlay color',
            description: 'Choose the overlay tint color used by governed shell surfaces.',
            action_id: 'appearance_open_overlay_color',
            icon: 'appearance',
          },
          {
            item_id: 'appearance-overlay-opacity',
            label: 'Overlay opacity',
            description: 'Adjust overlay transparency while preserving shell readability.',
            action_id: 'appearance_open_overlay_opacity',
            icon: 'appearance',
          },
        ],
      },
      {
        level_id: 'appearance-layout-template',
        level_label: 'Layout Template',
        items: [
          {
            item_id: 'appearance-overlay-width',
            label: 'Overlay width',
            description: 'Adjust the governed overlay width.',
            action_id: 'appearance_open_overlay_width',
            icon: 'appearance',
          },
          {
            item_id: 'appearance-canvas-padding',
            label: 'Canvas padding',
            description: 'Adjust shell menu and overlay spacing.',
            action_id: 'appearance_open_canvas_padding',
            icon: 'appearance',
          },
          {
            item_id: 'appearance-reset-defaults',
            label: 'Reset to defaults',
            description: 'Restore governed default shell appearance settings.',
            action_id: 'appearance_reset_defaults',
            icon: 'appearance',
          },
        ],
      },
      {
        level_id: 'appearance-background-source',
        level_label: 'Background Source',
        items: [
          {
            item_id: 'appearance-background-live-effects',
            label: 'Live effects',
            description: 'Use the governed live shell background system.',
            action_id: 'appearance_set_background_live_effects',
            icon: 'appearance',
          },
          {
            item_id: 'appearance-background-custom',
            label: 'Custom media',
            description: 'Select a custom local image or video background.',
            action_id: 'appearance_open_custom_background',
            icon: 'appearance',
          },
          {
            item_id: 'appearance-background-library',
            label: 'Installed media library',
            description: 'Choose from registered local background assets.',
            action_id: 'appearance_open_background_library',
            icon: 'appearance',
          },
        ],
      },
    ],
    template_family: 'list',
    permission_class: 'appearance_customization',
    data_source_ref: 'shell.menu.appearance.v1',
    selection_behavior: 'open_surface',
    disclosure_requirements: [
      'shell_owned',
      'deterministic_levels',
      'intent_first',
      'top_aligned',
    ],
  },
};

export const AGENT_IDENTITY_MENU: ShellMenuRegistryEntry = {
  menu_id: 'agent-identity',
  menu_zone: 'agent_identity',
  permission_class: 'agent_identity_management',
  data_source_ref: 'shell.menu.agent_identity.v2',
  parent_menu_id: 'shell-header-system',
  launched_from_action_id: 'open_menu_agent_identity',
  launch_mode: 'push_child',
  record: {
    menu_id: 'agent-identity',
    menu_zone: 'agent_identity',
    content_type: 'settings',
    level_count: 5,
    levels: [
      {
        level_id: 'agent-identity-communication',
        level_label: 'Communication & behavior',
        items: [
          {
            item_id: 'agent-open-disc-settings',
            label: 'DISC profile',
            description: 'Adjust behavioral personality traits used in governed responses.',
            action_id: 'open_disc_settings',
            icon: 'disc',
          },
          {
            item_id: 'agent-open-arch-reference',
            label: 'ARCH protocol',
            description: 'Acknowledge, Reflect, Context, Handoff — reference for governed communication.',
            action_id: 'open_arch_protocol_reference',
            icon: 'system',
          },
        ],
      },
      {
        level_id: 'agent-identity-core',
        level_label: 'Agent Identity',
        items: [
          {
            item_id: 'agent-identity-name',
            label: 'Agent Name',
            description: 'Set the governed agent name.',
            action_id: 'agent_identity_edit_name',
            icon: 'system',
            detail_surface: 'agent.identity.name.v1',
          },
          {
            item_id: 'agent-identity-company',
            label: 'Agent Company',
            description: 'Set the organization or company context.',
            action_id: 'agent_identity_edit_company',
            icon: 'system',
            detail_surface: 'agent.identity.company.v1',
          },
          {
            item_id: 'agent-identity-role',
            label: 'Agent Role',
            description: 'Set the current governed agent role.',
            action_id: 'agent_identity_edit_role',
            icon: 'system',
            detail_surface: 'agent.identity.role.v1',
          },
        ],
      },
      {
        level_id: 'agent-identity-agent-intent',
        level_label: 'Agent Intent',
        items: [
          {
            item_id: 'agent-intent-edit',
            label: 'Edit Agent Intent',
            description: 'Define the primary goal the agent should pursue.',
            action_id: 'agent_identity_edit_agent_intent',
            icon: 'system',
            detail_surface: 'agent.identity.agent_intent.v1',
          },
        ],
      },
      {
        level_id: 'agent-identity-user-intent',
        level_label: 'User Intent',
        items: [
          {
            item_id: 'user-intent-edit',
            label: 'Edit User Intent',
            description: 'Capture what the user is trying to achieve.',
            action_id: 'agent_identity_edit_user_intent',
            icon: 'system',
            detail_surface: 'agent.identity.user_intent.v1',
          },
        ],
      },
      {
        level_id: 'agent-identity-desired-outcome',
        level_label: 'Desired Outcome',
        items: [
          {
            item_id: 'desired-outcome-edit',
            label: 'Edit Desired Outcome',
            description: 'Define the success condition for the current session.',
            action_id: 'agent_identity_edit_desired_outcome',
            icon: 'system',
            detail_surface: 'agent.identity.desired_outcome.v1',
          },
        ],
      },
    ],
    template_family: 'list',
    permission_class: 'agent_identity_management',
    data_source_ref: 'shell.menu.agent_identity.v2',
    selection_behavior: 'open_surface',
    disclosure_requirements: [
      'shell_owned',
      'deterministic_levels',
      'intent_first',
      'top_aligned',
      'governed_configuration',
    ],
    detail_surfaces: [
      {
        surface_id: 'agent.identity.name.v1',
        title: 'Agent name',
        description: 'Displayed name for the governed shell agent.',
        render_mode: 'level_2_detail',
      },
      {
        surface_id: 'agent.identity.company.v1',
        title: 'Agent company',
        description: 'Organization or company context.',
        render_mode: 'level_2_detail',
      },
      {
        surface_id: 'agent.identity.role.v1',
        title: 'Agent role',
        description: 'Current governed role label.',
        render_mode: 'level_2_detail',
      },
      {
        surface_id: 'agent.identity.agent_intent.v1',
        title: 'Agent intent',
        description: 'Primary goal the agent should pursue.',
        render_mode: 'level_2_detail',
      },
      {
        surface_id: 'agent.identity.user_intent.v1',
        title: 'User intent',
        description: 'What the user is trying to achieve.',
        render_mode: 'level_2_detail',
      },
      {
        surface_id: 'agent.identity.desired_outcome.v1',
        title: 'Desired outcome',
        description: 'Success condition for this session.',
        render_mode: 'level_2_detail',
      },
    ],
  },
};

export const CENTRAL_SHELL_MENU_REGISTRY: Record<ShellMenuId, ShellMenuRegistryEntry> = {
  'shell-header-system': SHELL_HEADER_SYSTEM_MENU,
  'shell-footer-user': SHELL_FOOTER_USER_MENU,
  'system-controls': SYSTEM_CONTROLS_MENU,
  'guest-entry': GUEST_ENTRY_MENU,
  'voice-control': VOICE_CONTROL_MENU,
  'voice-box': VOICE_BOX_MENU,
  appearance: APPEARANCE_MENU,
  'agent-identity': AGENT_IDENTITY_MENU,
};

