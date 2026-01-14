use tauri::State;

use crate::database::models::{Button, Folder};
use crate::database::repository;
use super::DbConnection;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct PositionUpdate {
    pub id: String,
    pub position: i32,
}

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

/// Update multiple button positions at once
#[tauri::command]
pub async fn update_button_positions(
    updates: Vec<PositionUpdate>,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let updates_vec: Vec<(String, i32)> = updates
        .into_iter()
        .map(|u| (u.id, u.position))
        .collect();

    repository::update_button_positions(&conn, &updates_vec)
        .map_err(|e| format!("Failed to update button positions: {}", e))
}

/// Update multiple monitor positions at once
#[tauri::command]
pub async fn update_monitor_positions(
    updates: Vec<PositionUpdate>,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let updates_vec: Vec<(String, i32)> = updates
        .into_iter()
        .map(|u| (u.id, u.position))
        .collect();

    repository::update_monitor_positions(&conn, &updates_vec)
        .map_err(|e| format!("Failed to update monitor positions: {}", e))
}

/// Update multiple folder positions at once
#[tauri::command]
pub async fn update_folder_positions(
    updates: Vec<PositionUpdate>,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let updates_vec: Vec<(String, i32)> = updates
        .into_iter()
        .map(|u| (u.id, u.position))
        .collect();

    repository::update_folder_positions(&conn, &updates_vec)
        .map_err(|e| format!("Failed to update folder positions: {}", e))
}

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
