use reqwest::Client;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters,
};

const SAMPLE_RATE: u32 = 16_000;
const MIN_INTERIM_SAMPLES: usize = SAMPLE_RATE as usize;
const INTERIM_WINDOW_SAMPLES: usize = SAMPLE_RATE as usize * 5;
const MODEL_FILENAME: &str = "ggml-base.bin";
const MODEL_URL: &str = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";

#[derive(Debug)]
pub struct VoiceSession {
    pub full_buffer: Vec<f32>,
    pub sample_rate: u32,
    samples_since_interim: usize,
}

impl Default for VoiceSession {
    fn default() -> Self {
        Self {
            full_buffer: Vec::new(),
            sample_rate: SAMPLE_RATE,
            samples_since_interim: 0,
        }
    }
}

impl VoiceSession {
    fn append_pcm(&mut self, pcm_data: &[f32]) {
        self.full_buffer.extend_from_slice(pcm_data);
        self.samples_since_interim += pcm_data.len();
    }

    fn maybe_interim_snapshot(&mut self) -> Option<Vec<f32>> {
        if self.full_buffer.len() < MIN_INTERIM_SAMPLES
            || self.samples_since_interim < MIN_INTERIM_SAMPLES
        {
            return None;
        }

        self.samples_since_interim = 0;
        let start = self.full_buffer.len().saturating_sub(INTERIM_WINDOW_SAMPLES);
        Some(self.full_buffer[start..].to_vec())
    }

    fn take_full_buffer(&mut self) -> Vec<f32> {
        self.samples_since_interim = 0;
        std::mem::take(&mut self.full_buffer)
    }

    fn clear(&mut self) {
        self.full_buffer.clear();
        self.samples_since_interim = 0;
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelInitStatus {
    pub ready: bool,
    pub downloaded: bool,
    pub model_path: String,
}

#[derive(Debug)]
struct ModelManager {
    model_path: PathBuf,
}

impl ModelManager {
    fn new(app_local_data_dir: PathBuf) -> Self {
        Self {
            model_path: app_local_data_dir.join(MODEL_FILENAME),
        }
    }

    fn model_path(&self) -> &Path {
        &self.model_path
    }

    fn is_ready(&self) -> bool {
        std::fs::metadata(&self.model_path)
            .map(|metadata| metadata.is_file() && metadata.len() > 0)
            .unwrap_or(false)
    }

    async fn ensure_model(&self) -> Result<ModelInitStatus, String> {
        if self.is_ready() {
            return Ok(ModelInitStatus {
                ready: true,
                downloaded: false,
                model_path: self.model_path.to_string_lossy().into_owned(),
            });
        }

        let parent = self
            .model_path
            .parent()
            .ok_or_else(|| "Unable to resolve app-local model directory".to_string())?;
        fs::create_dir_all(parent)
            .await
            .map_err(|error| format!("Failed to create model directory: {error}"))?;

        let temp_path = self.model_path.with_extension("bin.download");
        let client = Client::new();
        let mut response = client
            .get(MODEL_URL)
            .send()
            .await
            .map_err(|error| format!("Failed to download Whisper model: {error}"))?
            .error_for_status()
            .map_err(|error| format!("Whisper model download failed: {error}"))?;

        let mut file = fs::File::create(&temp_path)
            .await
            .map_err(|error| format!("Failed to create temporary model file: {error}"))?;

        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|error| format!("Failed while streaming Whisper model: {error}"))?
        {
            file.write_all(&chunk)
                .await
                .map_err(|error| format!("Failed writing Whisper model chunk: {error}"))?;
        }

        file.flush()
            .await
            .map_err(|error| format!("Failed to flush Whisper model file: {error}"))?;
        drop(file);

        if self.is_ready() {
            let _ = fs::remove_file(&temp_path).await;
        } else {
            fs::rename(&temp_path, &self.model_path)
                .await
                .map_err(|error| format!("Failed to finalize Whisper model download: {error}"))?;
        }

        Ok(ModelInitStatus {
            ready: true,
            downloaded: true,
            model_path: self.model_path.to_string_lossy().into_owned(),
        })
    }
}

pub struct VoiceRuntime {
    session: Mutex<VoiceSession>,
    model_manager: ModelManager,
    whisper_context: Arc<Mutex<Option<WhisperContext>>>,
}

impl VoiceRuntime {
    pub fn new(app_local_data_dir: PathBuf) -> Self {
        Self {
            session: Mutex::new(VoiceSession::default()),
            model_manager: ModelManager::new(app_local_data_dir),
            whisper_context: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn init_models(&self) -> Result<ModelInitStatus, String> {
        self.model_manager.ensure_model().await
    }

    pub fn append_audio_chunk(&self, pcm_data: &[f32]) -> Result<(usize, Option<Vec<f32>>), String> {
        let mut session = self
            .session
            .lock()
            .map_err(|_| "Voice session lock poisoned".to_string())?;
        session.append_pcm(pcm_data);
        let buffer_len = session.full_buffer.len();
        let interim_snapshot = session.maybe_interim_snapshot();
        Ok((buffer_len, interim_snapshot))
    }

    pub fn take_full_buffer(&self) -> Result<Vec<f32>, String> {
        let mut session = self
            .session
            .lock()
            .map_err(|_| "Voice session lock poisoned".to_string())?;
        Ok(session.take_full_buffer())
    }

    pub fn clear_session(&self) -> Result<(), String> {
        let mut session = self
            .session
            .lock()
            .map_err(|_| "Voice session lock poisoned".to_string())?;
        session.clear();
        Ok(())
    }

    pub async fn transcribe(&self, audio: Vec<f32>) -> Result<String, String> {
        if audio.is_empty() {
            return Ok(String::new());
        }

        if !self.model_manager.is_ready() {
            return Err(
                "Local Whisper model is missing. Call init_models before starting voice capture."
                    .to_string(),
            );
        }

        let model_path = self.model_manager.model_path().to_path_buf();
        let ctx_arc = Arc::clone(&self.whisper_context);

        tokio::task::spawn_blocking(move || {
            let mut context_guard = ctx_arc
                .lock()
                .map_err(|_| "Whisper context lock poisoned".to_string())?;
            if context_guard.is_none() {
                let context = WhisperContext::new_with_params(
                    &model_path,
                    WhisperContextParameters::default(),
                )
                .map_err(|error| format!("Failed to load Whisper model: {error}"))?;
                *context_guard = Some(context);
            }

            let context = context_guard
                .as_ref()
                .ok_or_else(|| "Whisper context failed to initialize".to_string())?;
            let mut state = context
                .create_state()
                .map_err(|error| format!("Failed to create Whisper state: {error}"))?;

            let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
            params.set_n_threads(inference_thread_count());
            params.set_language(Some("en"));
            params.set_translate(false);
            params.set_no_context(true);
            params.set_print_special(false);
            params.set_print_progress(false);
            params.set_print_realtime(false);
            params.set_print_timestamps(false);

            state
                .full(params, &audio)
                .map_err(|error| format!("Whisper inference failed: {error}"))?;

            let mut transcript = String::new();

            for segment in state.as_iter() {
                let text = segment
                    .to_str_lossy()
                    .map_err(|error| format!("Failed to read Whisper segment text: {error}"))?;
                let trimmed = text.trim();
                if trimmed.is_empty() {
                    continue;
                }
                if !transcript.is_empty() {
                    transcript.push(' ');
                }
                transcript.push_str(trimmed);
            }

            Ok(transcript.trim().to_string())
        })
        .await
        .map_err(|join_err| format!("Whisper inference task panicked: {join_err}"))?
    }

    pub fn session_sample_rate(&self) -> Result<u32, String> {
        let session = self
            .session
            .lock()
            .map_err(|_| "Voice session lock poisoned".to_string())?;
        Ok(session.sample_rate)
    }
}

fn inference_thread_count() -> i32 {
    std::thread::available_parallelism()
        .map(|parallelism| parallelism.get().min(4) as i32)
        .unwrap_or(2)
}
