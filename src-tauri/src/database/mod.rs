use rusqlite::{Connection, Result};
use tauri::Manager;

pub mod models;
pub mod repository;

pub fn init_database(app_handle: &tauri::AppHandle) -> Result<Connection> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");

    std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");

    let db_path = app_dir.join("devtools.db");
    let conn = Connection::open(db_path)?;

    create_tables(&conn)?;

    Ok(conn)
}

fn create_tables(conn: &Connection) -> Result<()> {
    // buttons 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS buttons (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            script_type TEXT NOT NULL,
            script_content TEXT NOT NULL,
            folder_id TEXT,
            position INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (folder_id) REFERENCES folders(id)
        )",
        [],
    )?;

    // folders 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            position INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    // monitors 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS monitors (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            monitor_type TEXT NOT NULL,
            target TEXT NOT NULL,
            check_interval INTEGER NOT NULL,
            expected_result TEXT,
            alert_on_failure BOOLEAN NOT NULL,
            is_active BOOLEAN NOT NULL,
            last_check_time INTEGER,
            last_status TEXT,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    // logs 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS logs (
            id TEXT PRIMARY KEY,
            button_id TEXT,
            monitor_id TEXT,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (button_id) REFERENCES buttons(id),
            FOREIGN KEY (monitor_id) REFERENCES monitors(id)
        )",
        [],
    )?;

    Ok(())
}
