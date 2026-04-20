/** Row from SQLite `coding_agent_projects` (schema v5); mirrors Tauri `CodingAgentProjectRow`. */
export interface CodingAgentProjectRecord {
  id: string;
  displayName: string;
  packageName: string;
  rootPath: string;
  createdAtMs: number;
  updatedAtMs: number;
}
