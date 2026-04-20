import type { VoiceRouteId } from '../config/voiceRoutePreference';
import type { VoiceProfile } from '../core/io/VoiceboxClient';
import type { ShellMenuId, ShellMenuRecord } from './shellMenuContract';
import type {
  ProtectedShellMenuPermissionClass,
  ProtectedShellMenuZone,
} from './shellAuthority';

export type ShellMenuLaunchMode =
  | 'replace_active'
  | 'push_child'
  | 'return_to_parent';

export interface ShellMenuRegistryEntry {
  menu_id: ShellMenuId;
  menu_zone: ProtectedShellMenuZone;
  permission_class: ProtectedShellMenuPermissionClass;
  data_source_ref: string;
  record: ShellMenuRecord;
  parent_menu_id: ShellMenuId | null;
  launched_from_action_id: string | null;
  launch_mode: ShellMenuLaunchMode;
}

export interface ShellMenuContextState {
  active_voice_route: VoiceRouteId;
  active_voice_profile_id: string | null;
  voicebox_ready: boolean;
  workspace_connected: boolean;
  diagnostics_enabled: boolean;
  appearance_dirty: boolean;
  agent_identity_dirty: boolean;
  auth_status: 'guest' | 'authenticated';
  active_surface_mode:
    | 'voice'
    | 'chat'
    | 'voice_control'
    | 'voice_settings'
    | 'appearance'
    | 'agent_identity'
    | 'workspace'
    | 'podcasts'
    | 'knowledge'
    | 'transparency'
    | 'api_health'
    | 'create_account'
    | 'coding_agent';
}

export interface ShellMenuUIState {
  active_menu_id: ShellMenuId | null;
  menu_stack: ShellMenuId[];
  is_open_by_menu_id: Partial<Record<ShellMenuId, boolean>>;
  active_level_id_by_menu_id: Partial<Record<ShellMenuId, string>>;
  selected_action_id_by_menu_id: Partial<Record<ShellMenuId, string>>;
}

export type ShellMenuRecordingStatus =
  | 'idle'
  | 'armed'
  | 'recording'
  | 'saving'
  | 'saved'
  | 'error';

export interface ShellMenuRecordingState {
  available_profiles: VoiceProfile[];
  active_profile_id: string | null;
  sample_count_by_profile_id: Record<string, number>;
  recommended_sample_target: number;
  sample_prompt_sentences: string[];
  selected_prompt_text: string;
  capture_status: ShellMenuRecordingStatus;
  capture_chunks: Blob[];
  last_saved_profile_id: string | null;
  last_saved_sample_at: string | null;
  last_error: string | null;
  ptt_binding_enabled: boolean;
  session_id: number;
  voicebox_ready: boolean | null;
}

export type ShellIntentIngestionStatus =
  | 'idle'
  | 'capturing'
  | 'processing'
  | 'bound'
  | 'handoff_ready'
  | 'error';

export type ProjectBaselineSource =
  | 'github_repository'
  | 'project_zip'
  | 'workspace_session'
  | 'unknown';

export interface ProjectBaseline {
  source: ProjectBaselineSource;
  project_id: string;
  session_id: string;
  repo_url?: string;
  branch?: string;
  commit?: string;
  zip_file_name?: string;
  directory_map_summary?: string;
  session_knowledge_refs?: string[];
}

export interface UserIntentPayload {
  id: string;
  captured_at: string;
  transcript: string;
  duration_ms?: number;
}

export interface ShortcutDetectionReport {
  ui_fragility: string[];
  mock_data_hallucinations: string[];
  repeated_code: string[];
  suppressed_exceptions: string[];
}

import type { EducationalLesson } from '../knowledge/KnowledgeBaseSchema';

export interface IntentReviewHandoffEnvelope {
  id: string;
  user_intent: UserIntentPayload;
  project_baseline: ProjectBaseline;
  session_context: Record<string, unknown>;
  review_request: {
    status: 'pending' | 'submitted';
    requested_at?: string;
  };
  audit: {
    created_at: string;
    created_by: string;
  };
  shortcut_report?: ShortcutDetectionReport;
  educational_lessons?: EducationalLesson[];
}

export interface SovereignAnalysisResponse {
  content: string;
  confidence_score: number;
  probability_disclosed: boolean;
}

export interface ShellMenuIntentIngestionState {
  status: ShellIntentIngestionStatus;
  current_payload: UserIntentPayload | null;
  active_baseline: ProjectBaseline | null;
  pending_review: IntentReviewHandoffEnvelope | null;
  last_error: string | null;
  mvp_success_probability: number | null;
  probability_disclosed: boolean | null;
}

export interface ShellMenuStoreState {
  registry_by_id: Record<ShellMenuId, ShellMenuRegistryEntry>;
  context: ShellMenuContextState;
  ui: ShellMenuUIState;
  recording: ShellMenuRecordingState;
  intent_ingestion: ShellMenuIntentIngestionState;
  revision: number;
}

export interface ShellMenuStoreSelectors {
  getActiveMenuId(state: ShellMenuStoreState): ShellMenuId | null;
  getActiveRecord(state: ShellMenuStoreState): ShellMenuRecord | null;
  getRecordById(state: ShellMenuStoreState, menuId: ShellMenuId): ShellMenuRecord | null;
  getParentMenuId(state: ShellMenuStoreState, menuId: ShellMenuId): ShellMenuId | null;
}

