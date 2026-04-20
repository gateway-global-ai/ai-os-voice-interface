use reqwest::{multipart, Client};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use zip::ZipArchive;

const VOICEBOX_PORT: u16 = 58000;
const HEALTH_RETRIES: u8 = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceProfile {
    pub id: String,
    pub name: String,
    pub sample_count: Option<u32>,
}

/// Returned by `synthesize_speech` so the frontend can fetch audio
/// directly from the sidecar's local HTTP server — no binary data
/// travels through the Tauri IPC bridge.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceboxSynthConfig {
    pub base_url: String,
    pub profile_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct VoiceboxArchiveManifest {
    profile: VoiceboxArchiveProfile,
}

#[derive(Debug, Deserialize)]
struct VoiceboxArchiveProfile {
    name: String,
}

pub struct VoiceboxRuntime {
    port: u16,
    data_dir: PathBuf,
    client: Client,
    child: Mutex<Option<tauri_plugin_shell::process::CommandChild>>,
    pub active_profile_id: Mutex<Option<String>>,
}

impl VoiceboxRuntime {
    pub fn new(app_local_data_dir: PathBuf) -> Self {
        Self {
            port: VOICEBOX_PORT,
            data_dir: app_local_data_dir.join("voicebox"),
            client: Client::new(),
            child: Mutex::new(None),
            active_profile_id: Mutex::new(None),
        }
    }

    fn base_url(&self) -> String {
        format!("http://127.0.0.1:{}", self.port)
    }

    /// Returns config needed by the frontend to stream audio directly
    /// from the Voicebox sidecar HTTP server, bypassing the IPC bridge.
    pub fn synth_config(&self, profile_id: Option<String>) -> VoiceboxSynthConfig {
        let pid = profile_id.or_else(|| {
            self.active_profile_id
                .lock()
                .ok()
                .and_then(|g| g.clone())
        });
        VoiceboxSynthConfig {
            base_url: self.base_url(),
            profile_id: pid,
        }
    }

    /// Spawn the voicebox-server sidecar and wait up to 5s for /health to respond.
    pub async fn spawn_sidecar(&self, app: &AppHandle) -> Result<(), String> {
        let data_dir_str = self.data_dir.to_string_lossy().to_string();

        let (_, child) = app
            .shell()
            .sidecar("voicebox-server")
            .map_err(|e| format!("Sidecar setup failed: {e}"))?
            .args(["--port", &self.port.to_string(), "--data-dir", &data_dir_str])
            .spawn()
            .map_err(|e| format!("Sidecar spawn failed: {e}"))?;

        *self
            .child
            .lock()
            .map_err(|_| "Child lock poisoned".to_string())? = Some(child);

        for attempt in 0..HEALTH_RETRIES {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            if self.health_check().await {
                println!("Voicebox sidecar healthy after {}ms", (attempt as u32 + 1) * 500);
                return Ok(());
            }
        }

        Err(format!(
            "Voicebox sidecar on port {} did not become healthy within 5s",
            self.port
        ))
    }

    pub async fn health_check(&self) -> bool {
        self.client
            .get(format!("{}/health", self.base_url()))
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }

    pub async fn list_profiles(&self) -> Result<Vec<VoiceProfile>, String> {
        self.client
            .get(format!("{}/profiles", self.base_url()))
            .send()
            .await
            .map_err(|e| format!("list_profiles request failed: {e}"))?
            .json::<Vec<VoiceProfile>>()
            .await
            .map_err(|e| format!("list_profiles parse failed: {e}"))
    }

    pub async fn create_profile(&self, name: &str) -> Result<VoiceProfile, String> {
        self.client
            .post(format!("{}/profiles", self.base_url()))
            .json(&serde_json::json!({ "name": name }))
            .send()
            .await
            .map_err(|e| format!("create_profile request failed: {e}"))?
            .json::<VoiceProfile>()
            .await
            .map_err(|e| format!("create_profile parse failed: {e}"))
    }

    pub async fn add_sample(&self, profile_id: &str, wav_bytes: Vec<u8>, reference_text: &str) -> Result<(), String> {
        let part = multipart::Part::bytes(wav_bytes)
            .file_name("sample.wav")
            .mime_str("audio/wav")
            .map_err(|e| e.to_string())?;
        let form = multipart::Form::new()
            .part("file", part)
            .text("reference_text", reference_text.to_string());

        let resp = self
            .client
            .post(format!(
                "{}/profiles/{}/samples",
                self.base_url(),
                profile_id
            ))
            .multipart(form)
            .send()
            .await
            .map_err(|e| format!("add_sample request failed: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!(
                "add_sample failed with status {}: {}",
                status, text
            ));
        }
        Ok(())
    }

    pub async fn import_profile_archive(&self, archive_path: &str) -> Result<VoiceProfile, String> {
        let archive_bytes = std::fs::read(archive_path)
            .map_err(|e| format!("Could not read archive '{}': {}", archive_path, e))?;
        let mut archive = ZipArchive::new(Cursor::new(archive_bytes))
            .map_err(|e| format!("Could not open Voice Box archive '{}': {}", archive_path, e))?;

        let manifest: VoiceboxArchiveManifest = read_archive_json(&mut archive, "manifest.json")?;
        let samples: HashMap<String, String> = read_archive_json(&mut archive, "samples.json")?;

        let profile_name = manifest.profile.name.trim();
        if profile_name.is_empty() {
            return Err("Voice Box archive manifest is missing profile.name".to_string());
        }
        if samples.is_empty() {
            return Err("Voice Box archive does not contain any sample metadata.".to_string());
        }

        let profile = self.create_profile(profile_name).await?;

        for (file_name, reference_text) in samples {
            let archive_entry = format!("samples/{}", file_name);
            let wav_bytes = {
                let mut sample_file = archive
                    .by_name(&archive_entry)
                    .map_err(|e| format!("Archive sample '{}' missing: {}", archive_entry, e))?;
                let mut wav_bytes = Vec::new();
                sample_file
                    .read_to_end(&mut wav_bytes)
                    .map_err(|e| format!("Could not read archive sample '{}': {}", archive_entry, e))?;
                wav_bytes
            };

            self.add_sample(&profile.id, wav_bytes, reference_text.trim()).await?;
        }

        if let Ok(mut active_profile_id) = self.active_profile_id.lock() {
            *active_profile_id = Some(profile.id.clone());
        }

        Ok(profile)
    }

}

fn read_archive_json<T: DeserializeOwned>(
    archive: &mut ZipArchive<Cursor<Vec<u8>>>,
    entry_name: &str,
) -> Result<T, String> {
    let mut file = archive
        .by_name(entry_name)
        .map_err(|e| format!("Archive entry '{}' missing: {}", entry_name, e))?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Could not read archive entry '{}': {}", entry_name, e))?;
    serde_json::from_str::<T>(&contents)
        .map_err(|e| format!("Could not parse archive entry '{}': {}", entry_name, e))
}

impl Drop for VoiceboxRuntime {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(child) = guard.take() {
                let _ = child.kill();
            }
        }
    }
}
