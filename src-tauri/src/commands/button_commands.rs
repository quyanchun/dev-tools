use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;

use crate::database::models::Button;
use crate::database::repository;

/// Create a new button
#[tauri::command]
pub async fn create_button(
    button: Button,
    state: State<'_, Mutex<Connection>>,
) -> Result<String, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    repository::create_button(&conn, &button)
        .map_err(|e| format!("Failed to create button: {}", e))
}

/// Get all buttons
#[tauri::command]
pub async fn get_all_buttons(
    state: State<'_, Mutex<Connection>>,
) -> Result<Vec<Button>, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    repository::get_all_buttons(&conn)
        .map_err(|e| format!("Failed to get buttons: {}", e))
}

/// Get a single button by ID
#[tauri::command]
pub async fn get_button(
    id: String,
    state: State<'_, Mutex<Connection>>,
) -> Result<Button, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    repository::get_button_by_id(&conn, &id)
        .map_err(|e| format!("Failed to get button: {}", e))
}

/// Update an existing button
#[tauri::command]
pub async fn update_button(
    id: String,
    button: Button,
    state: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    repository::update_button(&conn, &id, &button)
        .map_err(|e| format!("Failed to update button: {}", e))
}

/// Delete a button by ID
#[tauri::command]
pub async fn delete_button(
    id: String,
    state: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    repository::delete_button(&conn, &id)
        .map_err(|e| format!("Failed to delete button: {}", e))
}

/// Get buttons by folder ID
#[tauri::command]
pub async fn get_buttons_by_folder(
    folder_id: Option<String>,
    state: State<'_, Mutex<Connection>>,
) -> Result<Vec<Button>, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    repository::get_buttons_by_folder(&conn, folder_id.as_deref())
        .map_err(|e| format!("Failed to get buttons by folder: {}", e))
}
