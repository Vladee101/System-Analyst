use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::Manager;

pub fn get_db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let mut path = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    std::fs::create_dir_all(&path).ok();
    path.push("data.db");
    path
}

pub fn init_db(path: &PathBuf) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS scenario_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scenario_id TEXT NOT NULL,
            completed_at TEXT NOT NULL,
            overall_percentage REAL NOT NULL,
            grade TEXT NOT NULL,
            nodes_visited INTEGER NOT NULL,
            skills_json TEXT NOT NULL,
            timeline_json TEXT NOT NULL,
            flags_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_scenario_id ON scenario_results(scenario_id);
    ")?;
    Ok(conn)
}
