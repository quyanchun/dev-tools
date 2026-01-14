use rusqlite::{Connection, Result};
use super::models::{Button, LogEntry, Monitor};

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

// ============================================================================
// Monitor CRUD Operations
// ============================================================================

/// Create a new monitor in the database
pub fn create_monitor(conn: &Connection, monitor: &Monitor) -> Result<String> {
    conn.execute(
        "INSERT INTO monitors (id, name, icon, monitor_type, target, check_interval, expected_result,
         alert_on_failure, is_active, last_check_time, last_status, folder_id, position, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        (
            &monitor.id,
            &monitor.name,
            &monitor.icon,
            &monitor.monitor_type,
            &monitor.target,
            &monitor.check_interval,
            &monitor.expected_result,
            &monitor.alert_on_failure,
            &monitor.is_active,
            &monitor.last_check_time,
            &monitor.last_status,
            &monitor.folder_id,
            &monitor.position,
            &monitor.created_at,
        ),
    )?;
    Ok(monitor.id.clone())
}

/// Get all monitors
pub fn get_all_monitors(conn: &Connection) -> Result<Vec<Monitor>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, monitor_type, target, check_interval, expected_result,
         alert_on_failure, is_active, last_check_time, last_status, folder_id, position, created_at
         FROM monitors ORDER BY position, created_at DESC",
    )?;

    let monitors = stmt
        .query_map([], |row| {
            Ok(Monitor {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                monitor_type: row.get(3)?,
                target: row.get(4)?,
                check_interval: row.get(5)?,
                expected_result: row.get(6)?,
                alert_on_failure: row.get(7)?,
                is_active: row.get(8)?,
                last_check_time: row.get(9)?,
                last_status: row.get(10)?,
                folder_id: row.get(11)?,
                position: row.get(12)?,
                created_at: row.get(13)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(monitors)
}

/// Get a single monitor by ID
pub fn get_monitor_by_id(conn: &Connection, id: &str) -> Result<Monitor> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, monitor_type, target, check_interval, expected_result,
         alert_on_failure, is_active, last_check_time, last_status, folder_id, position, created_at
         FROM monitors WHERE id = ?1",
    )?;

    let monitor = stmt.query_row([id], |row| {
        Ok(Monitor {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            monitor_type: row.get(3)?,
            target: row.get(4)?,
            check_interval: row.get(5)?,
            expected_result: row.get(6)?,
            alert_on_failure: row.get(7)?,
            is_active: row.get(8)?,
            last_check_time: row.get(9)?,
            last_status: row.get(10)?,
            folder_id: row.get(11)?,
            position: row.get(12)?,
            created_at: row.get(13)?,
        })
    })?;

    Ok(monitor)
}

/// Update an existing monitor
pub fn update_monitor(conn: &Connection, id: &str, monitor: &Monitor) -> Result<()> {
    conn.execute(
        "UPDATE monitors
         SET name = ?1, icon = ?2, monitor_type = ?3, target = ?4, check_interval = ?5,
             expected_result = ?6, alert_on_failure = ?7, is_active = ?8,
             last_check_time = ?9, last_status = ?10, folder_id = ?11, position = ?12
         WHERE id = ?13",
        (
            &monitor.name,
            &monitor.icon,
            &monitor.monitor_type,
            &monitor.target,
            &monitor.check_interval,
            &monitor.expected_result,
            &monitor.alert_on_failure,
            &monitor.is_active,
            &monitor.last_check_time,
            &monitor.last_status,
            &monitor.folder_id,
            &monitor.position,
            id,
        ),
    )?;
    Ok(())
}

/// Delete a monitor by ID
pub fn delete_monitor(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM monitors WHERE id = ?1", [id])?;
    Ok(())
}

/// Update monitor status after a check
pub fn update_monitor_status(
    conn: &Connection,
    id: &str,
    status: &str,
    last_check_time: i64,
) -> Result<()> {
    conn.execute(
        "UPDATE monitors SET last_status = ?1, last_check_time = ?2 WHERE id = ?3",
        (status, last_check_time, id),
    )?;
    Ok(())
}

/// Get logs for a specific monitor
pub fn get_logs_by_monitor(conn: &Connection, monitor_id: &str) -> Result<Vec<LogEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, button_id, monitor_id, level, message, timestamp
         FROM logs WHERE monitor_id = ?1 ORDER BY timestamp DESC LIMIT 1000",
    )?;

    let logs = stmt
        .query_map([monitor_id], |row| {
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

// ============================================================================
// Batch Operations
// ============================================================================

/// Batch update button positions
pub fn update_button_positions(
    conn: &Connection,
    updates: &[(String, i32)], // (button_id, new_position)
) -> Result<()> {
    let now = chrono::Utc::now().timestamp();

    for (id, position) in updates {
        conn.execute(
            "UPDATE buttons SET position = ?1, updated_at = ?2 WHERE id = ?3",
            (position, now, id),
        )?;
    }

    Ok(())
}

// ============================================================================
// Folder Operations
// ============================================================================

/// Create a new folder
pub fn create_folder(conn: &Connection, folder: &super::models::Folder) -> Result<String> {
    conn.execute(
        "INSERT INTO folders (id, name, icon, position, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        (
            &folder.id,
            &folder.name,
            &folder.icon,
            &folder.position,
            &folder.created_at,
        ),
    )?;
    Ok(folder.id.clone())
}

/// Get all folders ordered by position
pub fn get_all_folders(conn: &Connection) -> Result<Vec<super::models::Folder>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, position, created_at
         FROM folders ORDER BY position",
    )?;

    let folders = stmt
        .query_map([], |row| {
            Ok(super::models::Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                position: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(folders)
}

/// Get a single folder by ID
pub fn get_folder_by_id(conn: &Connection, id: &str) -> Result<super::models::Folder> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, position, created_at
         FROM folders WHERE id = ?1",
    )?;

    let folder = stmt.query_row([id], |row| {
        Ok(super::models::Folder {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            position: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;

    Ok(folder)
}

/// Update an existing folder
pub fn update_folder(conn: &Connection, id: &str, folder: &super::models::Folder) -> Result<()> {
    conn.execute(
        "UPDATE folders
         SET name = ?1, icon = ?2, position = ?3
         WHERE id = ?4",
        (&folder.name, &folder.icon, &folder.position, id),
    )?;
    Ok(())
}

/// Delete a folder and move its buttons to root
pub fn delete_folder(conn: &Connection, id: &str) -> Result<()> {
    let now = chrono::Utc::now().timestamp();

    // Move all buttons in this folder to root (folder_id = NULL)
    conn.execute(
        "UPDATE buttons SET folder_id = NULL, updated_at = ?1 WHERE folder_id = ?2",
        (now, id),
    )?;

    // Delete the folder
    conn.execute("DELETE FROM folders WHERE id = ?1", [id])?;

    Ok(())
}
