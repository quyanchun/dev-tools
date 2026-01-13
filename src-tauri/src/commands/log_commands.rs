use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;

use crate::database::models::LogEntry;
use crate::database::repository;

/// Get all logs
#[tauri::command]
pub async fn get_logs(
    state: State<'_, Mutex<Connection>>,
) -> Result<Vec<LogEntry>, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    repository::get_all_logs(&conn)
        .map_err(|e| format!("Failed to get logs: {}", e))
}

/// Get logs for a specific button
#[tauri::command]
pub async fn get_logs_by_button(
    button_id: String,
    state: State<'_, Mutex<Connection>>,
) -> Result<Vec<LogEntry>, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    repository::get_logs_by_button(&conn, &button_id)
        .map_err(|e| format!("Failed to get logs by button: {}", e))
}

/// Clear all logs
#[tauri::command]
pub async fn clear_logs(
    state: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    repository::clear_all_logs(&conn)
        .map_err(|e| format!("Failed to clear logs: {}", e))
}
