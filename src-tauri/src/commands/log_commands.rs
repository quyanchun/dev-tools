use tauri::State;

use crate::database::models::LogEntry;
use crate::database::repository;
use super::DbConnection;

/// Get all logs
#[tauri::command]
pub async fn get_logs(
    db: State<'_, DbConnection>,
) -> Result<Vec<LogEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_all_logs(&conn)
        .map_err(|e| format!("Failed to get logs: {}", e))
}

/// Get logs for a specific button
#[tauri::command]
pub async fn get_logs_by_button(
    button_id: String,
    db: State<'_, DbConnection>,
) -> Result<Vec<LogEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_logs_by_button(&conn, &button_id)
        .map_err(|e| format!("Failed to get logs by button: {}", e))
}

/// Clear all logs
#[tauri::command]
pub async fn clear_logs(
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::clear_all_logs(&conn)
        .map_err(|e| format!("Failed to clear logs: {}", e))
}
