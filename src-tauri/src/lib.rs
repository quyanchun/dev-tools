mod commands;
mod database;
mod executor;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let conn = database::init_database(&app.handle())
                .expect("Failed to initialize database");

            app.manage(Mutex::new(conn));

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
            // Log commands
            commands::get_logs,
            commands::get_logs_by_button,
            commands::clear_logs,
            // Execution commands
            commands::execute_script,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
