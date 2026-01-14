mod button_commands;
mod log_commands;
mod execution_commands;
mod monitor_commands;

use tauri::State;

// Shared state types
pub use monitor_commands::{DbConnection, MonitorManagerState};

// Re-export commands
pub use button_commands::*;
pub use log_commands::*;
pub use execution_commands::*;
pub use monitor_commands::*;

#[tauri::command]
pub fn test_db_connection(db: State<DbConnection>) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // 测试查询
    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM buttons", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(format!("数据库连接成功！当前有 {} 个按钮", count))
}

#[tauri::command]
pub fn exit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}
