export type KernelVerbosityLevel =
  | 'book'
  | 'paragraph'
  | 'sentence'
  | 'start_button';

export type TaskNodeStatus = 'pending' | 'active' | 'completed';

export interface TaskNode {
  id: string;
  title: string;
  description: string;
  status: TaskNodeStatus | string;
  requires_action: boolean;
}

export interface CategoryNode {
  id: string;
  category_name: string;
  tasks: TaskNode[];
}

export interface OsStateSnapshot {
  current_intent: string;
  status: string;
  active_context_pointer: string;
  current_verbosity_level: KernelVerbosityLevel;
  /**
   * UI component ids the active NodeContract authorises for this intent.
   * No governed component should render unless its id is present here.
   * Example values: 'voice_ptt' | 'chat_input' | 'file_upload' |
   * 'shell_header_menu' | 'shell_footer_user_menu'
   */
  permitted_ui_components: string[];
  /**
   * Skill slugs made available by the NodeContract for this intent.
   * Example values: 'read_file' | 'list_directory' | 'pick_file'
   */
  available_skills: string[];
  /** Kernel PM tree (Purpose–Plan–Pressure); absent when the kernel has none. */
  active_project_nodes?: CategoryNode[] | null;
}

/** Convenience type-guard helpers for the command surface. */
export function kernelPermits(snapshot: OsStateSnapshot | null, component: string): boolean {
  return snapshot?.permitted_ui_components?.includes(component) ?? false;
}

export function kernelHasSkill(snapshot: OsStateSnapshot | null, skill: string): boolean {
  return snapshot?.available_skills.includes(skill) ?? false;
}
