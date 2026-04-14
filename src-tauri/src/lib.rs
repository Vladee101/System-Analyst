pub mod commands;
pub mod models;
mod db;

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_path = db::get_db_path(app.handle());
            let conn = db::init_db(&db_path).expect("Failed to initialize database");
            app.manage(commands::AppState {
                session: Mutex::new(models::SessionState::default()),
                scenarios: Mutex::new(HashMap::new()),
                db: Mutex::new(conn),
            });
            Ok(())
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
            commands::get_timeline,
            commands::save_results,
            commands::get_completions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
