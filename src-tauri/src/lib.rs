pub mod commands;
pub mod models;

use std::collections::HashMap;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(commands::AppState {
            session: Mutex::new(models::SessionState::default()),
            scenarios: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_scenario,
            commands::get_current_node,
            commands::submit_choice,
            commands::get_next_node,
            commands::get_scenario_json,
            commands::save_scenario,
            commands::delete_scenario,
            commands::list_scenarios,
            commands::get_results,
            commands::get_timeline
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
