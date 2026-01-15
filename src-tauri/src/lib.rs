mod commands;
mod database;
mod executor;
mod monitor;

use std::sync::{Arc, Mutex};
use tauri::Manager;
use monitor::MonitorManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let conn = database::init_database(&app.handle())
                .expect("Failed to initialize database");

            // Initialize monitor manager with Arc for async access
            let monitor_manager = Arc::new(MonitorManager::new());

            app.manage(commands::DbConnection(Mutex::new(conn)));
            app.manage(commands::MonitorManagerState(monitor_manager.clone()));

            // Get database path for monitor restoration
            let db_path = app.path()
                .app_data_dir()
                .expect("Failed to get app data dir")
                .join("devtools.db")
                .to_string_lossy()
                .to_string();

            // Restore active monitors on startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                restore_active_monitors(app_handle, monitor_manager, db_path).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::test_db_connection,
            commands::exit_app,
            // Unified item commands
            commands::get_all_items,
            commands::update_unified_positions,
            // Button commands
            commands::create_button,
            commands::get_all_buttons,
            commands::get_button,
            commands::update_button,
            commands::delete_button,
            commands::get_buttons_by_folder,
            // Folder commands
            commands::create_folder,
            commands::get_all_folders,
            commands::get_folder,
            commands::update_folder,
            commands::delete_folder,
            // Log commands
            commands::get_logs,
            commands::get_logs_by_button,
            commands::clear_logs,
            // Execution commands
            commands::execute_script,
            // Monitor commands
            commands::create_monitor,
            commands::get_all_monitors,
            commands::get_monitor,
            commands::update_monitor,
            commands::delete_monitor,
            commands::start_monitor,
            commands::stop_monitor,
            commands::get_monitor_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Restore monitors that were active before app shutdown
async fn restore_active_monitors(
    app_handle: tauri::AppHandle,
    monitor_manager: Arc<MonitorManager>,
    db_path: String,
) {
    // Open database connection
    let conn = match rusqlite::Connection::open(&db_path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to open database for monitor restoration: {}", e);
            return;
        }
    };

    // Get all monitors that were active
    let monitors = match database::repository::get_all_monitors(&conn) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Failed to get monitors for restoration: {}", e);
            return;
        }
    };

    // Start each active monitor
    for monitor in monitors {
        if monitor.is_active {
            if let Err(e) = monitor_manager
                .start_monitor(monitor.clone(), app_handle.clone(), db_path.clone())
                .await
            {
                eprintln!("Failed to restore monitor {}: {}", monitor.name, e);
            }
        }
    }
}
