use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::mpsc;

use crate::database::models::LogEntry;
use crate::database::repository;
use crate::executor::{ShellExecutor, PythonExecutor, JsExecutor};
use super::DbConnection;

/// Execute a script from a button
#[tauri::command]
pub async fn execute_script(
    button_id: String,
    app_handle: AppHandle,
    db: State<'_, DbConnection>,
) -> Result<String, String> {
    // Get button from database
    let button = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        repository::get_button_by_id(&conn, &button_id)
            .map_err(|e| format!("Failed to get button: {}", e))?
    };

    // Generate execution ID
    let execution_id = uuid::Uuid::new_v4().to_string();

    // Create a channel for log streaming
    let (log_tx, mut log_rx) = mpsc::channel::<LogEntry>(100);

    // Clone app_handle for the log receiver task
    let app_handle_clone = app_handle.clone();

    // Spawn a task to receive logs and emit them to frontend
    tokio::spawn(async move {
        while let Some(log_entry) = log_rx.recv().await {
            // Save log to database using app_handle's managed state
            if let Some(db_state) = app_handle_clone.try_state::<DbConnection>() {
                if let Ok(conn) = db_state.0.lock() {
                    let _ = repository::create_log(&conn, &log_entry);
                }
            }

            // Emit log to frontend
            let _ = app_handle_clone.emit("log-entry", &log_entry);
        }
    });

    // Execute based on script type
    match button.script_type.as_str() {
        "shell" => {
            let executor = ShellExecutor::new(
                execution_id.clone(),
                button.id.clone(),
                button.name.clone(),
                button.script_content.clone(),
            );

            // Spawn execution in background
            tokio::spawn(async move {
                let _ = executor.execute(log_tx).await;
            });

            Ok(execution_id)
        }
        "python" => {
            let executor = PythonExecutor::new(
                execution_id.clone(),
                button.id.clone(),
                button.name.clone(),
                button.script_content.clone(),
            );

            // Spawn execution in background
            tokio::spawn(async move {
                let _ = executor.execute(log_tx).await;
            });

            Ok(execution_id)
        }
        "javascript" => {
            let executor = JsExecutor::new(
                execution_id.clone(),
                button.id.clone(),
                button.name.clone(),
                button.script_content.clone(),
            );

            // Spawn execution in background
            tokio::spawn(async move {
                let _ = executor.execute(log_tx).await;
            });

            Ok(execution_id)
        }
        _ => Err(format!("Unknown script type: {}", button.script_type)),
    }
}
