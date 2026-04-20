//! Persisted Rust MCP / coding agent projects (SQLite). See `coding_agent_projects` table (schema v5).

use crate::state_machine::{AiosDbState, AiosResult, AiosStateError};
use rusqlite::params;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CodingAgentProjectRow {
    pub id: String,
    pub display_name: String,
    pub package_name: String,
    pub root_path: String,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn sanitize_package_base(name: &str) -> String {
    let mut out = String::new();
    for ch in name.trim().chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        } else if ch.is_whitespace() || ch == '_' {
            if !out.ends_with('-') && !out.is_empty() {
                out.push('-');
            }
        } else if ch == '-' {
            if !out.ends_with('-') && !out.is_empty() {
                out.push('-');
            }
        }
    }
    let out = out.trim_matches('-').to_string();
    if out.is_empty() {
        "mcp-server-project".to_string()
    } else {
        out
    }
}

fn allocate_unique_package_name(base: &str, parent: &Path) -> String {
    let mut candidate = base.to_string();
    let mut n = 0u32;
    loop {
        if !parent.join(&candidate).exists() {
            return candidate;
        }
        n += 1;
        candidate = format!("{base}-{n}");
    }
}

fn release_binary_path(root: &Path, package_name: &str) -> PathBuf {
    if cfg!(target_os = "windows") {
        root.join("target").join("release").join(format!("{package_name}.exe"))
    } else {
        root.join("target").join("release").join(package_name)
    }
}

#[tauri::command]
pub fn list_coding_agent_projects(state: State<'_, AiosDbState>) -> Result<Vec<CodingAgentProjectRow>, String> {
    state
        .with_connection(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, display_name, package_name, root_path, created_at_ms, updated_at_ms
                     FROM coding_agent_projects
                     ORDER BY updated_at_ms DESC",
                )
                .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(CodingAgentProjectRow {
                        id: row.get(0)?,
                        display_name: row.get(1)?,
                        package_name: row.get(2)?,
                        root_path: row.get(3)?,
                        created_at_ms: row.get(4)?,
                        updated_at_ms: row.get(5)?,
                    })
                })
                .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;
            let mut out = Vec::new();
            for r in rows {
                out.push(r.map_err(|e| AiosStateError::InvalidData(e.to_string()))?);
            }
            Ok(out)
        })
        .map_err(|e: AiosStateError| e.to_string())
}

#[tauri::command]
pub fn pick_coding_agent_parent_folder(app: AppHandle) -> Result<Option<String>, String> {
    let picked = app.dialog().file().blocking_pick_folder();
    Ok(picked.map(|fp| fp.to_string()))
}

#[tauri::command]
pub fn create_coding_agent_project(
    app: AppHandle,
    state: State<'_, AiosDbState>,
    display_name: String,
    parent_path: Option<String>,
) -> Result<CodingAgentProjectRow, String> {
    let trimmed = display_name.trim();
    if trimmed.is_empty() {
        return Err("Project name is required.".to_string());
    }

    let parent: PathBuf = if let Some(p) = parent_path {
        PathBuf::from(p.trim())
    } else {
        app.path()
            .app_local_data_dir()
            .map_err(|e| e.to_string())?
            .join("coding_agent_projects")
    };

    fs::create_dir_all(&parent).map_err(|e| e.to_string())?;

    let base = sanitize_package_base(trimmed);
    let package_name = allocate_unique_package_name(&base, &parent);

    let output = Command::new("cargo")
        .args(["new", &package_name, "--vcs", "none"])
        .current_dir(&parent)
        .output()
        .map_err(|e| format!("Failed to run cargo new: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("cargo new failed.\n{stdout}\n{stderr}"));
    }

    let root = parent.join(&package_name);
    let root_path = fs::canonicalize(&root)
        .unwrap_or(root)
        .to_string_lossy()
        .to_string();

    let id = uuid::Uuid::new_v4().to_string();
    let ts = now_ms();

    state
        .with_connection(|conn| {
            conn.execute(
                "INSERT INTO coding_agent_projects (
                    id, display_name, package_name, root_path, created_at_ms, updated_at_ms
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, trimmed, &package_name, &root_path, ts, ts],
            )
            .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;
            Ok(CodingAgentProjectRow {
                id,
                display_name: trimmed.to_string(),
                package_name,
                root_path,
                created_at_ms: ts,
                updated_at_ms: ts,
            })
        })
        .map_err(|e: AiosStateError| e.to_string())
}

#[tauri::command]
pub fn delete_coding_agent_project(
    state: State<'_, AiosDbState>,
    id: String,
    remove_files: bool,
) -> Result<(), String> {
    let row = project_by_id(&state, &id).map_err(|e| e.to_string())?;

    if remove_files {
        let p = PathBuf::from(&row.root_path);
        if p.exists() {
            fs::remove_dir_all(&p).map_err(|e| e.to_string())?;
        }
    }

    state
        .with_connection(|conn| {
            conn.execute(
                "DELETE FROM coding_agent_projects WHERE id = ?1",
                params![id],
            )
            .map_err(|e| AiosStateError::InvalidData(e.to_string()))?;
            Ok(())
        })
        .map_err(|e: AiosStateError| e.to_string())
}

#[tauri::command]
pub fn build_coding_agent_project_release(
    state: State<'_, AiosDbState>,
    id: String,
) -> Result<String, String> {
    let row = project_by_id(&state, &id).map_err(|e| e.to_string())?;
    let root = PathBuf::from(&row.root_path);
    if !root.is_dir() {
        return Err("Project directory no longer exists on disk.".to_string());
    }

    let output = Command::new("cargo")
        .args(["build", "--release"])
        .current_dir(&root)
        .output()
        .map_err(|e| format!("cargo build --release failed to start: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("cargo build --release failed.\n{stdout}\n{stderr}"));
    }

    let exe = release_binary_path(&root, &row.package_name);
    if !exe.is_file() {
        return Err(format!(
            "Build reported success but binary not found at {}.",
            exe.display()
        ));
    }

    Ok(exe.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_mcp_inspector_for_project(state: State<'_, AiosDbState>, id: String) -> Result<(), String> {
    let row = project_by_id(&state, &id).map_err(|e| e.to_string())?;
    let root = PathBuf::from(&row.root_path);
    if !root.is_dir() {
        return Err("Project directory no longer exists on disk.".to_string());
    }

    let exe = release_binary_path(&root, &row.package_name);
    if !exe.is_file() {
        return Err(
            "Release binary not found. Run a release build first (Getting started → Build release)."
                .to_string(),
        );
    }

    let rel = if cfg!(target_os = "windows") {
        format!("target\\release\\{}.exe", row.package_name)
    } else {
        format!("target/release/{}", row.package_name)
    };

    let mut cmd = Command::new("npx");
    cmd.args(["-y", "@modelcontextprotocol/inspector", &rel]);
    cmd.current_dir(&root);
    cmd.stdin(Stdio::null());
    cmd.stdout(Stdio::null());
    cmd.stderr(Stdio::null());

    cmd.spawn()
        .map_err(|e| format!("Failed to spawn MCP Inspector (is Node.js / npx on PATH?): {e}"))?;

    Ok(())
}

fn project_by_id(state: &AiosDbState, id: &str) -> AiosResult<CodingAgentProjectRow> {
    state.with_connection(|conn| {
        conn.query_row(
            "SELECT id, display_name, package_name, root_path, created_at_ms, updated_at_ms
             FROM coding_agent_projects WHERE id = ?1",
            params![id],
            |row| {
                Ok(CodingAgentProjectRow {
                    id: row.get(0)?,
                    display_name: row.get(1)?,
                    package_name: row.get(2)?,
                    root_path: row.get(3)?,
                    created_at_ms: row.get(4)?,
                    updated_at_ms: row.get(5)?,
                })
            },
        )
        .map_err(|_| AiosStateError::InvalidInput("Project not found.".to_string()))
    })
}
