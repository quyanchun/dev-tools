use rusqlite::{Connection, Result};
use super::models::{Button, LogEntry};

// ============================================================================
// Button CRUD Operations
// ============================================================================

/// Create a new button in the database
pub fn create_button(conn: &Connection, button: &Button) -> Result<String> {
    conn.execute(
        "INSERT INTO buttons (id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        (
            &button.id,
            &button.name,
            &button.icon,
            &button.script_type,
            &button.script_content,
            &button.folder_id,
            &button.position,
            &button.created_at,
            &button.updated_at,
        ),
    )?;
    Ok(button.id.clone())
}

/// Get all buttons ordered by position
pub fn get_all_buttons(conn: &Connection) -> Result<Vec<Button>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at
         FROM buttons ORDER BY position",
    )?;

    let buttons = stmt
        .query_map([], |row| {
            Ok(Button {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                script_type: row.get(3)?,
                script_content: row.get(4)?,
                folder_id: row.get(5)?,
                position: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(buttons)
}

/// Get a single button by ID
pub fn get_button_by_id(conn: &Connection, id: &str) -> Result<Button> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at
         FROM buttons WHERE id = ?1",
    )?;

    let button = stmt.query_row([id], |row| {
        Ok(Button {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            script_type: row.get(3)?,
            script_content: row.get(4)?,
            folder_id: row.get(5)?,
            position: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    Ok(button)
}

/// Update an existing button
pub fn update_button(conn: &Connection, id: &str, button: &Button) -> Result<()> {
    conn.execute(
        "UPDATE buttons
         SET name = ?1, icon = ?2, script_type = ?3, script_content = ?4,
             folder_id = ?5, position = ?6, updated_at = ?7
         WHERE id = ?8",
        (
            &button.name,
            &button.icon,
            &button.script_type,
            &button.script_content,
            &button.folder_id,
            &button.position,
            &button.updated_at,
            id,
        ),
    )?;
    Ok(())
}

/// Delete a button by ID
pub fn delete_button(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM buttons WHERE id = ?1", [id])?;
    Ok(())
}

/// Get buttons by folder ID (None for root level)
pub fn get_buttons_by_folder(conn: &Connection, folder_id: Option<&str>) -> Result<Vec<Button>> {
    let mut stmt = if folder_id.is_some() {
        conn.prepare(
            "SELECT id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at
             FROM buttons WHERE folder_id = ?1 ORDER BY position",
        )?
    } else {
        conn.prepare(
            "SELECT id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at
             FROM buttons WHERE folder_id IS NULL ORDER BY position",
        )?
    };

    let buttons = if let Some(fid) = folder_id {
        stmt.query_map([fid], |row| {
            Ok(Button {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                script_type: row.get(3)?,
                script_content: row.get(4)?,
                folder_id: row.get(5)?,
                position: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?
    } else {
        stmt.query_map([], |row| {
            Ok(Button {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                script_type: row.get(3)?,
                script_content: row.get(4)?,
                folder_id: row.get(5)?,
                position: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?
    };

    Ok(buttons)
}

// ============================================================================
// Log Operations
// ============================================================================

/// Create a new log entry
pub fn create_log(conn: &Connection, log: &LogEntry) -> Result<String> {
    conn.execute(
        "INSERT INTO logs (id, button_id, monitor_id, level, message, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (
            &log.id,
            &log.button_id,
            &log.monitor_id,
            &log.level,
            &log.message,
            &log.timestamp,
        ),
    )?;
    Ok(log.id.clone())
}

/// Get all logs ordered by timestamp (newest first)
pub fn get_all_logs(conn: &Connection) -> Result<Vec<LogEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, button_id, monitor_id, level, message, timestamp
         FROM logs ORDER BY timestamp DESC LIMIT 1000",
    )?;

    let logs = stmt
        .query_map([], |row| {
            Ok(LogEntry {
                id: row.get(0)?,
                button_id: row.get(1)?,
                monitor_id: row.get(2)?,
                level: row.get(3)?,
                message: row.get(4)?,
                timestamp: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(logs)
}

/// Get logs for a specific button
pub fn get_logs_by_button(conn: &Connection, button_id: &str) -> Result<Vec<LogEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, button_id, monitor_id, level, message, timestamp
         FROM logs WHERE button_id = ?1 ORDER BY timestamp DESC LIMIT 1000",
    )?;

    let logs = stmt
        .query_map([button_id], |row| {
            Ok(LogEntry {
                id: row.get(0)?,
                button_id: row.get(1)?,
                monitor_id: row.get(2)?,
                level: row.get(3)?,
                message: row.get(4)?,
                timestamp: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(logs)
}

/// Clear all logs
pub fn clear_all_logs(conn: &Connection) -> Result<()> {
    conn.execute("DELETE FROM logs", [])?;
    Ok(())
}
