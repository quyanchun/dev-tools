use tauri::State;

use crate::database::models::{Button, Folder, UnifiedItem, UnifiedPositionUpdate};
use crate::database::repository;
use super::DbConnection;

// ============================================================================
// Unified Item Commands
// ============================================================================

/// Get all items (monitors, folders, buttons) for a container, sorted by position
#[tauri::command]
pub async fn get_all_items(
    folder_id: Option<String>,
    db: State<'_, DbConnection>,
) -> Result<Vec<UnifiedItem>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_all_items_by_container(&conn, folder_id.as_deref())
        .map_err(|e| format!("Failed to get all items: {}", e))
}

/// Update positions for multiple items across all types in a single transaction
#[tauri::command]
pub async fn update_unified_positions(
    updates: Vec<UnifiedPositionUpdate>,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::update_unified_positions(&conn, &updates)
        .map_err(|e| format!("Failed to update unified positions: {}", e))
}

// ============================================================================
// Button Commands
// ============================================================================

/// Create a new button
#[tauri::command]
pub async fn create_button(
    button: Button,
    db: State<'_, DbConnection>,
) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::create_button(&conn, &button)
        .map_err(|e| format!("Failed to create button: {}", e))
}

/// Get all buttons
#[tauri::command]
pub async fn get_all_buttons(
    db: State<'_, DbConnection>,
) -> Result<Vec<Button>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_all_buttons(&conn)
        .map_err(|e| format!("Failed to get buttons: {}", e))
}

/// Get a single button by ID
#[tauri::command]
pub async fn get_button(
    id: String,
    db: State<'_, DbConnection>,
) -> Result<Button, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_button_by_id(&conn, &id)
        .map_err(|e| format!("Failed to get button: {}", e))
}

/// Update an existing button
#[tauri::command]
pub async fn update_button(
    id: String,
    button: Button,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::update_button(&conn, &id, &button)
        .map_err(|e| format!("Failed to update button: {}", e))
}

/// Delete a button by ID
#[tauri::command]
pub async fn delete_button(
    id: String,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::delete_button(&conn, &id)
        .map_err(|e| format!("Failed to delete button: {}", e))
}

/// Get buttons by folder ID
#[tauri::command]
pub async fn get_buttons_by_folder(
    folder_id: Option<String>,
    db: State<'_, DbConnection>,
) -> Result<Vec<Button>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_buttons_by_folder(&conn, folder_id.as_deref())
        .map_err(|e| format!("Failed to get buttons by folder: {}", e))
}

// Note: Old type-specific position update commands (update_button_positions,
// update_monitor_positions, update_folder_positions) have been removed.
// Use update_unified_positions() instead for all position updates.

// ============================================================================
// Folder Commands
// ============================================================================

/// Create a new folder
#[tauri::command]
pub async fn create_folder(
    folder: Folder,
    db: State<'_, DbConnection>,
) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::create_folder(&conn, &folder)
        .map_err(|e| format!("Failed to create folder: {}", e))
}

/// Get all folders
#[tauri::command]
pub async fn get_all_folders(
    db: State<'_, DbConnection>,
) -> Result<Vec<Folder>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_all_folders(&conn)
        .map_err(|e| format!("Failed to get folders: {}", e))
}

/// Get a single folder by ID
#[tauri::command]
pub async fn get_folder(
    id: String,
    db: State<'_, DbConnection>,
) -> Result<Folder, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::get_folder_by_id(&conn, &id)
        .map_err(|e| format!("Failed to get folder: {}", e))
}

/// Update an existing folder
#[tauri::command]
pub async fn update_folder(
    id: String,
    folder: Folder,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::update_folder(&conn, &id, &folder)
        .map_err(|e| format!("Failed to update folder: {}", e))
}

/// Delete a folder by ID
#[tauri::command]
pub async fn delete_folder(
    id: String,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    repository::delete_folder(&conn, &id)
        .map_err(|e| format!("Failed to delete folder: {}", e))
}
