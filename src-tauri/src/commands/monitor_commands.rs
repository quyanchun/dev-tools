use tauri::{State, Manager};
use std::sync::{Arc, Mutex};
use rusqlite::Connection;

use crate::database::models::Monitor;
use crate::database::repository;
use crate::monitor::MonitorManager;

/// Shared database connection state
pub struct DbConnection(pub Mutex<Connection>);

/// Shared monitor manager state (using Arc for async access)
pub struct MonitorManagerState(pub Arc<MonitorManager>);

/// Create a new monitor
#[tauri::command]
pub async fn create_monitor(
    db: State<'_, DbConnection>,
    monitor: Monitor,
) -> Result<Monitor, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // Generate a new UUID for the monitor
    let mut new_monitor = monitor;
    new_monitor.id = uuid::Uuid::new_v4().to_string();

    repository::create_monitor(&conn, &new_monitor)
        .map_err(|e| format!("Failed to create monitor: {}", e))?;

    Ok(new_monitor)
}

/// Get all monitors
#[tauri::command]
pub async fn get_all_monitors(db: State<'_, DbConnection>) -> Result<Vec<Monitor>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_all_monitors(&conn)
        .map_err(|e| format!("Failed to get monitors: {}", e))
}

/// Get a single monitor by ID
#[tauri::command]
pub async fn get_monitor(db: State<'_, DbConnection>, id: String) -> Result<Monitor, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_monitor_by_id(&conn, &id)
        .map_err(|e| format!("Failed to get monitor: {}", e))
}

/// Update an existing monitor
#[tauri::command]
pub async fn update_monitor(
    db: State<'_, DbConnection>,
    id: String,
    monitor: Monitor,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::update_monitor(&conn, &id, &monitor)
        .map_err(|e| format!("Failed to update monitor: {}", e))
}

/// Delete a monitor
#[tauri::command]
pub async fn delete_monitor(
    db: State<'_, DbConnection>,
    manager: State<'_, MonitorManagerState>,
    id: String,
) -> Result<(), String> {
    // Stop the monitor if it's running
    let _ = manager.0.stop_monitor(&id).await;

    // Delete from database
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    repository::delete_monitor(&conn, &id)
        .map_err(|e| format!("Failed to delete monitor: {}", e))
}

/// Start a monitor
#[tauri::command]
pub async fn start_monitor(
    db: State<'_, DbConnection>,
    manager: State<'_, MonitorManagerState>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    // Get monitor from database
    let monitor = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        repository::get_monitor_by_id(&conn, &id)
            .map_err(|e| format!("Failed to get monitor: {}", e))?
    };

    // Get database path
    let db_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("dev-tools.db")
        .to_string_lossy()
        .to_string();

    // Start the monitor
    manager.0.start_monitor(monitor, app_handle, db_path).await?;

    // Update is_active in database
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        let mut updated_monitor = repository::get_monitor_by_id(&conn, &id)
            .map_err(|e| format!("Failed to get monitor: {}", e))?;
        updated_monitor.is_active = true;
        repository::update_monitor(&conn, &id, &updated_monitor)
            .map_err(|e| format!("Failed to update monitor status: {}", e))?;
    }

    Ok(())
}

/// Stop a monitor
#[tauri::command]
pub async fn stop_monitor(
    db: State<'_, DbConnection>,
    manager: State<'_, MonitorManagerState>,
    id: String,
) -> Result<(), String> {
    // Stop the monitor
    manager.0.stop_monitor(&id).await?;

    // Update is_active in database
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut monitor = repository::get_monitor_by_id(&conn, &id)
        .map_err(|e| format!("Failed to get monitor: {}", e))?;
    monitor.is_active = false;
    repository::update_monitor(&conn, &id, &monitor)
        .map_err(|e| format!("Failed to update monitor status: {}", e))?;

    Ok(())
}

/// Get logs for a specific monitor
#[tauri::command]
pub async fn get_monitor_logs(
    db: State<'_, DbConnection>,
    monitor_id: String,
) -> Result<Vec<crate::database::models::LogEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_logs_by_monitor(&conn, &monitor_id)
        .map_err(|e| format!("Failed to get monitor logs: {}", e))
}
