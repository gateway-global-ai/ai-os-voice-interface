mod coding_agent_projects;
mod commands;
mod intent_loop;
mod state_machine;
mod state_machine_commands;
mod visual_context;
mod voice;
mod voicebox;

use crate::state_machine::{initialize_database, AiosDbState, OnboardingState};
use crate::state_machine_commands::OnboardingManager;
use crate::voice::VoiceRuntime;
use crate::voicebox::VoiceboxRuntime;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_mcp_bridge::init())
    .manage(AiosDbState::default())
    .manage(OnboardingManager(Mutex::new(OnboardingState::new())))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let app_local_data_dir = app.path().app_local_data_dir()?;
      app.manage(VoiceRuntime::new(app_local_data_dir.clone()));

      // Voicebox sidecar — wrap in Arc so we can move into spawn task
      let voicebox = Arc::new(VoiceboxRuntime::new(app_local_data_dir.clone()));
      app.manage(Arc::clone(&voicebox));

      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        match voicebox.spawn_sidecar(&handle).await {
          Ok(_) => println!("Voicebox sidecar ready on port 58000"),
          Err(e) => eprintln!("Voicebox sidecar failed to start: {e}"),
        }
      });

      let connection = initialize_database(app_local_data_dir)?;
      let db_state: tauri::State<'_, AiosDbState> = app.state();
      db_state.set_connection(connection)?;

      let args: Vec<String> = std::env::args().collect();
      if args.iter().any(|a| a == "--coding-agent") {
        if let Some(w) = app.get_webview_window("main") {
          let _ = w.emit("open_coding_agent", ());
        }
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::execute_blind_action,
      commands::init_models,
      commands::transcribe_audio_chunk,
      commands::finalize_transcription,
      commands::abort_transcription,
      commands::ensure_voicebox_ready,
      commands::list_voicebox_profiles,
      commands::create_voicebox_profile,
      commands::add_voicebox_sample,
      commands::set_active_voicebox_profile,
      commands::import_voicebox_profile_archive,
      commands::synthesize_speech,
      commands::get_conversation_history,
      commands::append_conversation_message,
      commands::list_directory,
      commands::read_file,
      commands::pick_file,
      commands::pick_voicebox_archive_path,
      commands::dispatch_invite,
      state_machine_commands::get_os_state,
      state_machine_commands::process_intent,
      state_machine_commands::record_outcome,
      state_machine_commands::register_node_contract,
      visual_context::capture_visual_context,
      intent_loop::resolve_intent_menu,
      intent_loop::get_active_intent_state,
      coding_agent_projects::list_coding_agent_projects,
      coding_agent_projects::create_coding_agent_project,
      coding_agent_projects::delete_coding_agent_project,
      coding_agent_projects::build_coding_agent_project_release,
      coding_agent_projects::open_mcp_inspector_for_project,
      coding_agent_projects::pick_coding_agent_parent_folder,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
