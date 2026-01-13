mod commands;
mod database;

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
        .invoke_handler(tauri::generate_handler![commands::test_db_connection])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
