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
            app.manage(commands::MonitorManagerState(monitor_manager));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::test_db_connection,
            // Button commands
            commands::create_button,
            commands::get_all_buttons,
            commands::get_button,
            commands::update_button,
            commands::delete_button,
            commands::get_buttons_by_folder,
            commands::update_button_positions,
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
