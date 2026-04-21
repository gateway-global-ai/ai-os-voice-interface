import {
  protectedShellMenuZoneAllowsPermission,
  type ProtectedShellMenuPermissionClass,
  type ProtectedShellMenuZone,
} from './shellAuthority';

export type ShellMenuId =
  | 'shell-header-system'
  | 'shell-footer-user'
  | 'system-controls'
  | 'guest-entry'
  | 'voice-control'
  | 'voice-box'
  | 'appearance'
  | 'agent-identity';

export type ShellMenuTemplateFamily = 'list' | 'thumbnail' | 'custom';

export type ShellMenuContentType =
  | 'system'
  | 'workspace'
  | 'knowledge'
  | 'podcasts'
  | 'transparency'
  | 'settings'
  | 'diagnostics';

export type ShellMenuSelectionBehavior = 'open_panel' | 'open_surface' | 'run_action';

export type ShellMenuDetailSurfaceId =
  | 'voicebox.record.capture.v1'
  | 'system.profile.v1'
  | 'system.scripts.v1'
  | 'agent.identity.name.v1'
  | 'agent.identity.company.v1'
  | 'agent.identity.role.v1'
  | 'agent.identity.agent_intent.v1'
  | 'agent.identity.user_intent.v1'
  | 'agent.identity.desired_outcome.v1';

export type ShellMenuIcon =
  | 'workspace'
  | 'storage'
  | 'voice'
  | 'appearance'
  | 'podcasts'
  | 'knowledge'
  | 'transparency'
  | 'profile'
  | 'diagnostics'
  | 'system'
  | 'disc';

export interface ShellMenuItem {
  item_id: string;
  label: string;
  description?: string;
  action_id: string;
  icon?: ShellMenuIcon;
  badge?: string;
  disabled?: boolean;
  detail_surface?: ShellMenuDetailSurfaceId;
}

export interface ShellMenuLevel {
  level_id: string;
  level_label: string;
  items: ShellMenuItem[];
}

export interface ShellMenuDetailSurfaceDefinition {
  surface_id: ShellMenuDetailSurfaceId;
  title: string;
  description?: string;
  render_mode: 'level_2_detail';
  requires_ptt_binding?: boolean;
}

export interface ShellMenuRecord {
  menu_id: ShellMenuId;
  menu_zone: ProtectedShellMenuZone;
  content_type: ShellMenuContentType;
  level_count: number;
  levels: ShellMenuLevel[];
  template_family: ShellMenuTemplateFamily;
  permission_class: ProtectedShellMenuPermissionClass;
  data_source_ref: string;
  selection_behavior: ShellMenuSelectionBehavior;
  disclosure_requirements: string[];
  detail_surfaces?: ShellMenuDetailSurfaceDefinition[];
}

export function isValidShellMenuRecord(record: ShellMenuRecord): boolean {
  if (record.level_count !== record.levels.length) return false;
  if (!protectedShellMenuZoneAllowsPermission(record.menu_zone, record.permission_class)) return false;
  const detailSurfaceIds = new Set((record.detail_surfaces ?? []).map((surface) => surface.surface_id));
  return record.levels.every(
    (level) =>
      level.items.length > 0 &&
      level.items.every((item) => !item.detail_surface || detailSurfaceIds.has(item.detail_surface)),
  );
}
