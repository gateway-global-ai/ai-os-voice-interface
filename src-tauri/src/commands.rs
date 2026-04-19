use crate::state_machine::{update_active_intent, AiosDbState, ConversationMessage};
use crate::state_machine::{get_conversation_history as db_get_history, append_conversation_message as db_append_message};
use crate::voice::{ModelInitStatus, VoiceRuntime};
use crate::voicebox::{VoiceProfile, VoiceboxRuntime, VoiceboxSynthConfig};
use std::sync::Arc;
use tauri::{Emitter, State, Window};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use tokio::time::sleep;

/// Real PCM command for SovereignVoiceEngine (raw Float32Array from Web Audio API).
/// This receives perfect 16kHz mono PCM - no decoding required.
#[tauri::command]
pub async fn init_models(voice: State<'_, VoiceRuntime>) -> Result<ModelInitStatus, String> {
    voice.init_models().await
}

#[tauri::command]
pub async fn transcribe_audio_chunk(
    window: Window,
    voice: State<'_, VoiceRuntime>,
    pcm_data: Vec<f32>,
) -> Result<(), String> {
    let (buffer_len, interim_audio) = voice.append_audio_chunk(&pcm_data)?;
    let sample_rate = voice.session_sample_rate()?;

    println!(
        "Sovereign STT: Received {} raw PCM samples at {} Hz (buffer now {} samples)",
        pcm_data.len(),
        sample_rate,
        buffer_len
    );

    if let Some(audio_snapshot) = interim_audio {
        match voice.transcribe(audio_snapshot).await {
            Ok(text) if !text.trim().is_empty() => {
                let _ = window.emit("interim_transcription", text.clone());
                println!("Interim transcription: {}", text);
            }
            Ok(_) => {}
            Err(error) => {
                eprintln!("Interim Whisper transcription skipped: {}", error);
            }
        }
    }

    Ok(())
}

/// Finalize current utterance on PTT release.
#[tauri::command]
pub async fn finalize_transcription(
    state: State<'_, AiosDbState>,
    voice: State<'_, VoiceRuntime>,
    window: Window,
) -> Result<(), String> {
    let buffer = voice.take_full_buffer()?;
    let text = if !buffer.is_empty() {
        let result = voice.transcribe(buffer).await?;
        if result.trim().is_empty() {
            "I didn't catch that. Could you repeat?".to_string()
        } else {
            let snapshot = update_active_intent(&state, result.clone()).map_err(|error| error.to_string())?;
            window
                .emit("os_state_changed", &snapshot)
                .map_err(|error| error.to_string())?;
            result
        }
    } else {
        "I didn't catch that. Could you repeat?".to_string()
    };

    let _ = window.emit("final_transcription", text.clone());
    println!("Final transcription: {}", text);
    Ok(())
}

/// Deterministic Early-Exit: Abort current transcription on interrupt keyword detection.
/// Clears the global audio buffer and emits acknowledgment. Prevents LLM from waking.
#[tauri::command]
pub async fn abort_transcription(
    window: Window,
    voice: State<'_, VoiceRuntime>,
) -> Result<(), String> {
    voice.clear_session()?;

    let _ = window.emit("abort_acknowledged", "Transcription buffer cleared. Intent aborted.");
    println!("Sovereign Kernel: Abort command received - buffer cleared.");

    Ok(())
}

/// Existing high-performance Ollama streaming command (Cloud Lane fallback / LLM core)
#[tauri::command]
pub async fn execute_blind_action(
    window: Window,
    intent_text: String,
    system_prompt: Option<String>,
) -> Result<String, String> {
    let client = Client::new();
    println!("Kernel received intent: {}", intent_text);

    let mut payload = serde_json::json!({
        "model": "llama3.2",
        "prompt": intent_text,
        "stream": true,
        "options": {
            "temperature": 0.7,
            "num_ctx": 4096
        }
    });
    if let Some(system) = system_prompt {
        payload["system"] = serde_json::Value::String(system);
    }

    let mut response = client
        .post("http://localhost:11434/api/generate")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    let mut full_response = String::new();

    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        if let Ok(json) = serde_json::from_slice::<Value>(&chunk) {
            if let Some(token) = json.get("response").and_then(|v| v.as_str()) {
                full_response.push_str(token);
                let _ = window.emit("llm_token", token);
                sleep(Duration::from_millis(20)).await;
            }
            
            if json.get("done").and_then(|v| v.as_bool()).unwrap_or(false) {
                break;
            }
        }
    }

    println!("Kernel completed response: {} chars", full_response.len());
    Ok(full_response)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_command_signatures() {
        // Commands are tested at runtime by Tauri
    }
}

// ─── Conversation History Commands ──────────────────────────────────────────

#[tauri::command]
pub async fn get_conversation_history(
    state: State<'_, AiosDbState>,
) -> Result<Vec<ConversationMessage>, String> {
    db_get_history(&state).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn append_conversation_message(
    state: State<'_, AiosDbState>,
    message: ConversationMessage,
) -> Result<(), String> {
    db_append_message(&state, message).map_err(|e| e.to_string())
}

// ─── Voicebox Sidecar Commands ──────────────────────────────────────────────

#[tauri::command]
pub async fn ensure_voicebox_ready(vb: State<'_, Arc<VoiceboxRuntime>>) -> Result<bool, String> {
    Ok(vb.health_check().await)
}

#[tauri::command]
pub async fn list_voicebox_profiles(
    vb: State<'_, Arc<VoiceboxRuntime>>,
) -> Result<Vec<VoiceProfile>, String> {
    vb.list_profiles().await
}

#[tauri::command]
pub async fn create_voicebox_profile(
    vb: State<'_, Arc<VoiceboxRuntime>>,
    name: String,
) -> Result<VoiceProfile, String> {
    vb.create_profile(&name).await
}

#[tauri::command]
pub async fn add_voicebox_sample(
    vb: State<'_, Arc<VoiceboxRuntime>>,
    profile_id: String,
    wav_data: Vec<u8>,
    reference_text: String,
) -> Result<(), String> {
    vb.add_sample(&profile_id, wav_data, &reference_text).await
}

#[tauri::command]
pub async fn set_active_voicebox_profile(
    vb: State<'_, Arc<VoiceboxRuntime>>,
    profile_id: String,
) -> Result<(), String> {
    *vb.active_profile_id
        .lock()
        .map_err(|_| "active_profile_id lock poisoned".to_string())? = Some(profile_id);
    Ok(())
}

#[tauri::command]
pub async fn import_voicebox_profile_archive(
    vb: State<'_, Arc<VoiceboxRuntime>>,
    archive_path: String,
) -> Result<VoiceProfile, String> {
    vb.import_profile_archive(&archive_path).await
}

/// Returns the base URL and active profile so the frontend can POST to
/// /generate/stream directly — audio bytes never cross the IPC bridge.
#[tauri::command]
pub async fn synthesize_speech(
    vb: State<'_, Arc<VoiceboxRuntime>>,
    text: String,
    profile_id: Option<String>,
) -> Result<VoiceboxSynthConfig, String> {
    let _ = text; // reserved for future server-side caching / logging
    Ok(vb.synth_config(profile_id))
}

// ─── File System Commands ────────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: Option<u64>,
}

/// List the contents of a directory. Returns an error if the path is not a directory.
#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let dir = std::path::Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }
    let mut entries = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta = entry.metadata().ok();
        entries.push(DirEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: entry.path().to_string_lossy().into_owned(),
            is_dir: meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
            size_bytes: meta.as_ref().filter(|m| m.is_file()).map(|m| m.len()),
        });
    }
    // Alphabetical — dirs first
    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(entries)
}

/// Read a text file and return its contents.  
/// Capped at 512 KB to prevent accidentally piping huge binaries into the LLM context.
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    const MAX_BYTES: u64 = 512 * 1024;
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_BYTES {
        return Err(format!(
            "File exceeds 512 KB limit ({} bytes). Truncate or split it first.",
            meta.len()
        ));
    }
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Open the native OS file picker and return the chosen file path + its text contents.
/// Returns `None` if the user cancels.
#[tauri::command]
pub async fn pick_file(app: tauri::AppHandle) -> Result<Option<(String, String)>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file_path = app
        .dialog()
        .file()
        .blocking_pick_file();

    match file_path {
        Some(fp) => {
            let path_str = fp.to_string();
            let content = std::fs::read_to_string(&path_str)
                .map_err(|e| format!("Could not read '{}': {}", path_str, e))?;
            Ok(Some((path_str, content)))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn pick_voicebox_archive_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file_path = app
        .dialog()
        .file()
        .add_filter("Voice Box archive", &["zip"])
        .blocking_pick_file();

    Ok(file_path.map(|path| path.to_string()))
}

/// Dispatch an early-access SMS invite via Twilio.
///
/// Called by `ScreenInvite` after the user enters a contact's phone number.
/// Credentials are passed from the frontend (read from Vite's `process.env.*`)
/// so the API key never needs to be compiled into the binary.
///
/// Twilio REST: POST /2010-04-01/Accounts/{AccountSid}/Messages.json
/// Auth: Basic (AccountSid : AuthToken)
#[tauri::command]
pub async fn dispatch_invite(
    phone: String,
    commander_name: String,
    twilio_account_sid: String,
    twilio_auth_token: String,
    twilio_from: String,
) -> Result<(), String> {
    if twilio_account_sid.is_empty() || twilio_auth_token.is_empty() {
        return Err("Twilio credentials are not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local.".to_string());
    }

    // Normalise the "from" number — store as digits only in env, Twilio needs +E.164.
    let from_e164 = if twilio_from.starts_with('+') {
        twilio_from.clone()
    } else {
        format!("+{}", twilio_from)
    };

    let body = format!(
        "{} invited you to early access for AI OS. Claim your terminal: http://earlyaccess.gatewayglobal.ai",
        commander_name
    );

    let url = format!(
        "https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json",
        twilio_account_sid
    );

    let client = Client::new();
    let response = client
        .post(&url)
        .basic_auth(&twilio_account_sid, Some(&twilio_auth_token))
        .form(&[
            ("To", phone.as_str()),
            ("From", from_e164.as_str()),
            ("Body", body.as_str()),
        ])
        .send()
        .await
        .map_err(|e| format!("Twilio request failed: {e}"))?;

    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        Err(format!("Twilio returned {status}: {text}"))
    }
}
