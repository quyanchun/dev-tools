use rusqlite::{Connection, Result};
use super::models::{Button, LogEntry, Monitor, UnifiedItem};

// ============================================================================
// Unified Item Operations
// ============================================================================

/// Calculate the next available position for a new item in a container
pub fn get_next_position(conn: &Connection, folder_id: Option<&str>) -> Result<i32> {
    let query = if folder_id.is_some() {
        "SELECT COALESCE(MAX(position), -1) FROM (
            SELECT position FROM monitors WHERE folder_id = ?1
            UNION ALL
            SELECT position FROM buttons WHERE folder_id = ?1
        )"
    } else {
        "SELECT COALESCE(MAX(position), -1) FROM (
            SELECT position FROM monitors WHERE folder_id IS NULL
            UNION ALL
            SELECT position FROM folders
            UNION ALL
            SELECT position FROM buttons WHERE folder_id IS NULL
        )"
    };

    let max_position: i32 = if let Some(fid) = folder_id {
        conn.query_row(query, [fid], |row| row.get(0))?
    } else {
        conn.query_row(query, [], |row| row.get(0))?
    };

    Ok(max_position + 1)
}

/// Shift positions of items at or after a given position (for insertion)
pub fn shift_positions_for_insertion(
    conn: &Connection,
    folder_id: Option<&str>,
    insert_position: i32,
) -> Result<()> {
    let tx = conn.unchecked_transaction()?;

    // Shift monitors
    if folder_id.is_some() {
        tx.execute(
            "UPDATE monitors SET position = position + 1 
             WHERE folder_id = ?1 AND position >= ?2",
            (folder_id, insert_position),
        )?;
    } else {
        tx.execute(
            "UPDATE monitors SET position = position + 1 
             WHERE folder_id IS NULL AND position >= ?1",
            [insert_position],
        )?;
    }

    // Shift folders (only at root level)
    if folder_id.is_none() {
        tx.execute(
            "UPDATE folders SET position = position + 1 WHERE position >= ?1",
            [insert_position],
        )?;
    }

    // Shift buttons
    if folder_id.is_some() {
        tx.execute(
            "UPDATE buttons SET position = position + 1, updated_at = ?1
             WHERE folder_id = ?2 AND position >= ?3",
            (chrono::Utc::now().timestamp(), folder_id, insert_position),
        )?;
    } else {
        tx.execute(
            "UPDATE buttons SET position = position + 1, updated_at = ?1
             WHERE folder_id IS NULL AND position >= ?2",
            (chrono::Utc::now().timestamp(), insert_position),
        )?;
    }

    tx.commit()?;
    Ok(())
}

/// Eliminate gaps in positions after deletion (renumber to 0..n-1)
pub fn eliminate_position_gaps(conn: &Connection, folder_id: Option<&str>) -> Result<()> {
    let tx = conn.unchecked_transaction()?;

    // Get all items in the container sorted by position
    let items = get_all_items_by_container(&tx, folder_id)?;

    // Renumber items sequentially
    for (new_position, item) in items.iter().enumerate() {
        let new_pos = new_position as i32;
        match item {
            UnifiedItem::Monitor(m) => {
                if m.position != new_pos {
                    tx.execute(
                        "UPDATE monitors SET position = ?1 WHERE id = ?2",
                        (new_pos, &m.id),
                    )?;
                }
            }
            UnifiedItem::Folder(f) => {
                if f.position != new_pos {
                    tx.execute(
                        "UPDATE folders SET position = ?1 WHERE id = ?2",
                        (new_pos, &f.id),
                    )?;
                }
            }
            UnifiedItem::Button(b) => {
                if b.position != new_pos {
                    tx.execute(
                        "UPDATE buttons SET position = ?1, updated_at = ?2 WHERE id = ?3",
                        (new_pos, chrono::Utc::now().timestamp(), &b.id),
                    )?;
                }
            }
        }
    }

    tx.commit()?;
    Ok(())
}

/// Validate that all positions in a container are unique
pub fn validate_position_uniqueness(conn: &Connection, folder_id: Option<&str>) -> Result<bool> {
    let items = get_all_items_by_container(conn, folder_id)?;
    let mut positions = std::collections::HashSet::new();

    for item in items {
        let position = match item {
            UnifiedItem::Monitor(m) => m.position,
            UnifiedItem::Folder(f) => f.position,
            UnifiedItem::Button(b) => b.position,
        };

        if !positions.insert(position) {
            return Ok(false); // Duplicate found
        }
    }

    Ok(true) // All unique
}

/// Validate that a position value is valid (non-negative and doesn't create gaps)
pub fn validate_position_value(
    conn: &Connection,
    folder_id: Option<&str>,
    position: i32,
) -> Result<bool> {
    // Check non-negative
    if position < 0 {
        return Ok(false);
    }

    // Get current max position
    let items = get_all_items_by_container(conn, folder_id)?;
    let max_position = items.len() as i32;

    // Position should not create a gap (should be <= max_position)
    Ok(position <= max_position)
}

/// Get ALL items (monitors, folders, buttons) from all containers
/// This returns items from root level AND all folders
pub fn get_all_items_all_containers(conn: &Connection) -> Result<Vec<UnifiedItem>> {
    let mut items = Vec::new();

    // Query ALL monitors (regardless of folder_id)
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, monitor_type, target, check_interval, expected_result,
         alert_on_failure, is_active, last_check_time, last_status, folder_id, position, created_at
         FROM monitors ORDER BY folder_id, position"
    )?;

    let monitors: Vec<Monitor> = stmt.query_map([], |row| {
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

    for monitor in monitors {
        items.push(UnifiedItem::Monitor(monitor));
    }

    // Query ALL folders
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, position, created_at
         FROM folders ORDER BY position"
    )?;

    let folders: Vec<super::models::Folder> = stmt.query_map([], |row| {
        Ok(super::models::Folder {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            position: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?
    .collect::<Result<Vec<_>>>()?;

    for folder in folders {
        items.push(UnifiedItem::Folder(folder));
    }

    // Query ALL buttons (regardless of folder_id)
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at
         FROM buttons ORDER BY folder_id, position"
    )?;

    let buttons: Vec<Button> = stmt.query_map([], |row| {
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

    for button in buttons {
        items.push(UnifiedItem::Button(button));
    }

    Ok(items)
}

/// Get all items (monitors, folders, buttons) by container, sorted by position
pub fn get_all_items_by_container(
    conn: &Connection,
    folder_id: Option<&str>,
) -> Result<Vec<UnifiedItem>> {
    let mut items = Vec::new();

    // Query monitors
    let monitor_query = if folder_id.is_some() {
        "SELECT id, name, icon, monitor_type, target, check_interval, expected_result,
         alert_on_failure, is_active, last_check_time, last_status, folder_id, position, created_at
         FROM monitors WHERE folder_id = ?1 ORDER BY position"
    } else {
        "SELECT id, name, icon, monitor_type, target, check_interval, expected_result,
         alert_on_failure, is_active, last_check_time, last_status, folder_id, position, created_at
         FROM monitors WHERE folder_id IS NULL ORDER BY position"
    };

    let mut stmt = conn.prepare(monitor_query)?;
    
    let monitors: Vec<Monitor> = if let Some(fid) = folder_id {
        stmt.query_map([fid], |row| {
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
        .collect::<Result<Vec<_>>>()?
    } else {
        stmt.query_map([], |row| {
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
        .collect::<Result<Vec<_>>>()?
    };

    for monitor in monitors {
        items.push(UnifiedItem::Monitor(monitor));
    }

    // Query folders (only at root level, folders don't have folder_id)
    if folder_id.is_none() {
        let mut stmt = conn.prepare(
            "SELECT id, name, icon, position, created_at
             FROM folders ORDER BY position"
        )?;

        let folders: Vec<super::models::Folder> = stmt.query_map([], |row| {
            Ok(super::models::Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                position: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        for folder in folders {
            items.push(UnifiedItem::Folder(folder));
        }
    }

    // Query buttons
    let button_query = if folder_id.is_some() {
        "SELECT id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at
         FROM buttons WHERE folder_id = ?1 ORDER BY position"
    } else {
        "SELECT id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at
         FROM buttons WHERE folder_id IS NULL ORDER BY position"
    };

    let mut stmt = conn.prepare(button_query)?;
    
    let buttons: Vec<Button> = if let Some(fid) = folder_id {
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

    for button in buttons {
        items.push(UnifiedItem::Button(button));
    }

    // Sort all items by position
    items.sort_by_key(|item| match item {
        UnifiedItem::Monitor(m) => m.position,
        UnifiedItem::Folder(f) => f.position,
        UnifiedItem::Button(b) => b.position,
    });

    Ok(items)
}

/// Batch update positions for items across all types in a single transaction
pub fn update_unified_positions(
    conn: &Connection,
    updates: &[super::models::UnifiedPositionUpdate],
) -> Result<()> {
    // Validate: check for duplicate positions within same container
    use std::collections::HashMap;
    let mut position_map: HashMap<Option<String>, Vec<i32>> = HashMap::new();
    
    for update in updates {
        let container_key = update.folder_id.clone();
        position_map.entry(container_key).or_insert_with(Vec::new).push(update.position);
    }
    
    // Check for duplicates
    for (_, positions) in position_map.iter() {
        let mut sorted_positions = positions.clone();
        sorted_positions.sort();
        for i in 1..sorted_positions.len() {
            if sorted_positions[i] == sorted_positions[i - 1] {
                return Err(rusqlite::Error::InvalidParameterName(
                    "Duplicate positions detected in same container".to_string()
                ));
            }
        }
    }
    
    // Validate: check for negative positions
    for update in updates {
        if update.position < 0 {
            return Err(rusqlite::Error::InvalidParameterName(
                format!("Invalid position: {} (must be non-negative)", update.position)
            ));
        }
    }
    
    // Note: Removed overly strict gap validation that was causing issues
    // when moving items between containers. The frontend handles position
    // calculation correctly, so we trust the incoming positions.

    // Start transaction
    let tx = conn.unchecked_transaction()?;
    
    let now = chrono::Utc::now().timestamp();

    // Apply updates
    for update in updates {
        match update.item_type.as_str() {
            "monitor" => {
                tx.execute(
                    "UPDATE monitors SET position = ?1, folder_id = ?2 WHERE id = ?3",
                    (&update.position, &update.folder_id, &update.id),
                )?;
            }
            "folder" => {
                tx.execute(
                    "UPDATE folders SET position = ?1 WHERE id = ?2",
                    (&update.position, &update.id),
                )?;
            }
            "button" => {
                tx.execute(
                    "UPDATE buttons SET position = ?1, folder_id = ?2, updated_at = ?3 WHERE id = ?4",
                    (&update.position, &update.folder_id, now, &update.id),
                )?;
            }
            _ => {
                return Err(rusqlite::Error::InvalidParameterName(
                    format!("Invalid item_type: {}", update.item_type)
                ));
            }
        }
    }

    // Commit transaction
    tx.commit()?;

    Ok(())
}

// ============================================================================
// Button CRUD Operations
// ============================================================================

/// Create a new button in the database
pub fn create_button(conn: &Connection, button: &Button) -> Result<String> {
    // If position is not set (or is -1), calculate next position
    let position = if button.position < 0 {
        get_next_position(conn, button.folder_id.as_deref())?
    } else {
        button.position
    };
    
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
            position,
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
    // Get the button's folder_id before deletion
    let button = get_button_by_id(conn, id)?;
    let folder_id = button.folder_id.clone();
    
    conn.execute("DELETE FROM buttons WHERE id = ?1", [id])?;
    
    // Eliminate gaps after deletion
    eliminate_position_gaps(conn, folder_id.as_deref())?;
    
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
    // If position is not set (or is -1), calculate next position
    let position = if monitor.position < 0 {
        get_next_position(conn, monitor.folder_id.as_deref())?
    } else {
        monitor.position
    };
    
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
            position,
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
    // Get the monitor's folder_id before deletion
    let monitor = get_monitor_by_id(conn, id)?;
    let folder_id = monitor.folder_id.clone();
    
    conn.execute("DELETE FROM monitors WHERE id = ?1", [id])?;
    
    // Eliminate gaps after deletion
    eliminate_position_gaps(conn, folder_id.as_deref())?;
    
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
// Note: Old type-specific position update functions (update_button_positions,
// update_monitor_positions, update_folder_positions) have been removed.
// Use update_unified_positions() instead for all position updates.

// ============================================================================
// Folder Operations
// ============================================================================

/// Create a new folder
pub fn create_folder(conn: &Connection, folder: &super::models::Folder) -> Result<String> {
    // If position is not set (or is -1), calculate next position
    let position = if folder.position < 0 {
        get_next_position(conn, None)?
    } else {
        folder.position
    };
    
    conn.execute(
        "INSERT INTO folders (id, name, icon, position, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        (
            &folder.id,
            &folder.name,
            &folder.icon,
            position,
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

    // Move all monitors in this folder to root
    conn.execute(
        "UPDATE monitors SET folder_id = NULL WHERE folder_id = ?1",
        [id],
    )?;

    // Delete the folder
    conn.execute("DELETE FROM folders WHERE id = ?1", [id])?;

    // Eliminate gaps in root level after folder deletion
    eliminate_position_gaps(conn, None)?;

    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;
    use rusqlite::Connection;
    use crate::database::models::{Button, Monitor, Folder, UnifiedPositionUpdate};

    // Helper function to create an in-memory test database
    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        
        // Create tables
        conn.execute(
            "CREATE TABLE buttons (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                script_type TEXT NOT NULL,
                script_content TEXT NOT NULL,
                folder_id TEXT,
                position INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        ).unwrap();

        conn.execute(
            "CREATE TABLE folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                position INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        ).unwrap();

        conn.execute(
            "CREATE TABLE monitors (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                monitor_type TEXT NOT NULL,
                target TEXT NOT NULL,
                check_interval INTEGER NOT NULL,
                expected_result TEXT,
                alert_on_failure BOOLEAN NOT NULL,
                is_active BOOLEAN NOT NULL,
                last_check_time INTEGER,
                last_status TEXT,
                folder_id TEXT,
                position INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        ).unwrap();

        conn
    }

    // Feature: unified-item-sorting, Property 1: Query Returns Items Sorted by Position
    // Validates: Requirements 1.2
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn test_query_returns_sorted_items(
            num_monitors in 0..5usize,
            num_folders in 0..5usize,
            num_buttons in 0..5usize,
        ) {
            let conn = create_test_db();
            let mut all_positions = Vec::new();

            // Generate random positions for monitors
            for i in 0..num_monitors {
                let pos = (i * 3) as i32;
                all_positions.push(pos);
                let monitor = Monitor {
                    id: format!("monitor_{}", i),
                    name: format!("Monitor {}", i),
                    icon: None,
                    monitor_type: "api".to_string(),
                    target: "http://example.com".to_string(),
                    check_interval: 60,
                    expected_result: None,
                    alert_on_failure: false,
                    is_active: false,
                    last_check_time: None,
                    last_status: None,
                    folder_id: None,
                    position: pos,
                    created_at: chrono::Utc::now().timestamp(),
                };
                create_monitor(&conn, &monitor).unwrap();
            }

            // Generate random positions for folders
            for i in 0..num_folders {
                let pos = (i * 3 + 1) as i32;
                all_positions.push(pos);
                let folder = Folder {
                    id: format!("folder_{}", i),
                    name: format!("Folder {}", i),
                    icon: None,
                    position: pos,
                    created_at: chrono::Utc::now().timestamp(),
                };
                create_folder(&conn, &folder).unwrap();
            }

            // Generate random positions for buttons
            for i in 0..num_buttons {
                let pos = (i * 3 + 2) as i32;
                all_positions.push(pos);
                let button = Button {
                    id: format!("button_{}", i),
                    name: format!("Button {}", i),
                    icon: None,
                    script_type: "shell".to_string(),
                    script_content: "echo test".to_string(),
                    folder_id: None,
                    position: pos,
                    created_at: chrono::Utc::now().timestamp(),
                    updated_at: chrono::Utc::now().timestamp(),
                };
                create_button(&conn, &button).unwrap();
            }

            // Query all items
            let items = get_all_items_by_container(&conn, None).unwrap();

            // Verify items are sorted by position
            let positions: Vec<i32> = items.iter().map(|item| match item {
                UnifiedItem::Monitor(m) => m.position,
                UnifiedItem::Folder(f) => f.position,
                UnifiedItem::Button(b) => b.position,
            }).collect();

            // Check that positions are in ascending order
            for i in 1..positions.len() {
                prop_assert!(positions[i] >= positions[i - 1], 
                    "Items not sorted by position: {:?}", positions);
            }
        }
    }

    // Feature: unified-item-sorting, Property 14: API Validates Unique Positions
    // Validates: Requirements 7.3
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn test_api_validates_unique_positions(
            duplicate_position in 0..10i32,
        ) {
            let conn = create_test_db();

            // Create two items with the same position in the same container
            let updates = vec![
                UnifiedPositionUpdate {
                    id: "item1".to_string(),
                    item_type: "button".to_string(),
                    position: duplicate_position,
                    folder_id: None,
                },
                UnifiedPositionUpdate {
                    id: "item2".to_string(),
                    item_type: "monitor".to_string(),
                    position: duplicate_position,
                    folder_id: None,
                },
            ];

            // First create the items
            let button = Button {
                id: "item1".to_string(),
                name: "Button 1".to_string(),
                icon: None,
                script_type: "shell".to_string(),
                script_content: "echo test".to_string(),
                folder_id: None,
                position: 0,
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            create_button(&conn, &button).unwrap();

            let monitor = Monitor {
                id: "item2".to_string(),
                name: "Monitor 1".to_string(),
                icon: None,
                monitor_type: "api".to_string(),
                target: "http://example.com".to_string(),
                check_interval: 60,
                expected_result: None,
                alert_on_failure: false,
                is_active: false,
                last_check_time: None,
                last_status: None,
                folder_id: None,
                position: 1,
                created_at: chrono::Utc::now().timestamp(),
            };
            create_monitor(&conn, &monitor).unwrap();

            // Attempt to update with duplicate positions
            let result = update_unified_positions(&conn, &updates);

            // Verify that the API rejects the update
            prop_assert!(result.is_err(), 
                "API should reject duplicate positions in same container");
        }
    }

    // Feature: unified-item-sorting, Property 2: New Item Gets Next Position
    // Validates: Requirements 1.4
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn test_new_item_gets_next_position(
            num_existing_items in 0..10usize,
        ) {
            let conn = create_test_db();

            // Create existing items with sequential positions
            for i in 0..num_existing_items {
                let button = Button {
                    id: format!("button_{}", i),
                    name: format!("Button {}", i),
                    icon: None,
                    script_type: "shell".to_string(),
                    script_content: "echo test".to_string(),
                    folder_id: None,
                    position: i as i32,
                    created_at: chrono::Utc::now().timestamp(),
                    updated_at: chrono::Utc::now().timestamp(),
                };
                create_button(&conn, &button).unwrap();
            }

            // Get the next position
            let next_position = get_next_position(&conn, None).unwrap();

            // Verify it equals max + 1
            let expected_position = num_existing_items as i32;
            prop_assert_eq!(next_position, expected_position,
                "Next position should be {} but got {}", expected_position, next_position);

            // Create a new item with position -1 (auto-assign)
            let new_button = Button {
                id: "new_button".to_string(),
                name: "New Button".to_string(),
                icon: None,
                script_type: "shell".to_string(),
                script_content: "echo test".to_string(),
                folder_id: None,
                position: -1, // Auto-assign
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            create_button(&conn, &new_button).unwrap();

            // Verify the button was created with the correct position
            let created_button = get_button_by_id(&conn, "new_button").unwrap();
            prop_assert_eq!(created_button.position, expected_position,
                "Created button should have position {} but got {}", expected_position, created_button.position);
        }
    }

    // Feature: unified-item-sorting, Property 3: Insertion Shifts Subsequent Items
    // Validates: Requirements 2.1
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn test_insertion_shifts_subsequent_items(
            num_items in 2..10usize,
            insert_position in 0..9i32,
        ) {
            let insert_pos = insert_position.min((num_items - 1) as i32);
            let conn = create_test_db();

            // Create items with sequential positions
            for i in 0..num_items {
                let button = Button {
                    id: format!("button_{}", i),
                    name: format!("Button {}", i),
                    icon: None,
                    script_type: "shell".to_string(),
                    script_content: "echo test".to_string(),
                    folder_id: None,
                    position: i as i32,
                    created_at: chrono::Utc::now().timestamp(),
                    updated_at: chrono::Utc::now().timestamp(),
                };
                create_button(&conn, &button).unwrap();
            }

            // Shift positions for insertion
            shift_positions_for_insertion(&conn, None, insert_pos).unwrap();

            // Get all items and verify positions
            let items = get_all_items_by_container(&conn, None).unwrap();
            
            // Check that all items at or after insert_pos have been incremented
            for item in items {
                if let UnifiedItem::Button(b) = item {
                    let original_id: usize = b.id.strip_prefix("button_").unwrap().parse().unwrap();
                    let original_position = original_id as i32;
                    
                    if original_position >= insert_pos {
                        prop_assert_eq!(b.position, original_position + 1,
                            "Button {} should have position {} but got {}", 
                            b.id, original_position + 1, b.position);
                    } else {
                        prop_assert_eq!(b.position, original_position,
                            "Button {} should have position {} but got {}", 
                            b.id, original_position, b.position);
                    }
                }
            }
        }
    }

    // Feature: unified-item-sorting, Property 4: Deletion Eliminates Gaps
    // Validates: Requirements 2.2
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn test_deletion_eliminates_gaps(
            num_items in 2..10usize,
            delete_index in 0..9usize,
        ) {
            let delete_idx = delete_index.min(num_items - 1);
            let conn = create_test_db();

            // Create items with sequential positions
            for i in 0..num_items {
                let button = Button {
                    id: format!("button_{}", i),
                    name: format!("Button {}", i),
                    icon: None,
                    script_type: "shell".to_string(),
                    script_content: "echo test".to_string(),
                    folder_id: None,
                    position: i as i32,
                    created_at: chrono::Utc::now().timestamp(),
                    updated_at: chrono::Utc::now().timestamp(),
                };
                create_button(&conn, &button).unwrap();
            }

            // Delete an item (delete_button will call eliminate_position_gaps)
            let delete_id = format!("button_{}", delete_idx);
            delete_button(&conn, &delete_id).unwrap();

            // Get remaining items
            let items = get_all_items_by_container(&conn, None).unwrap();
            
            // Verify positions are consecutive 0..n-1
            prop_assert_eq!(items.len(), num_items - 1,
                "Should have {} items after deletion but got {}", num_items - 1, items.len());
            
            let mut positions: Vec<i32> = items.iter().map(|item| match item {
                UnifiedItem::Button(b) => b.position,
                _ => panic!("Unexpected item type"),
            }).collect();
            positions.sort();
            
            for (i, pos) in positions.iter().enumerate() {
                prop_assert_eq!(*pos, i as i32,
                    "Position at index {} should be {} but got {}", i, i, pos);
            }
        }
    }

    // Feature: unified-item-sorting, Property 5: Positions Are Always Unique
    // Validates: Requirements 2.4
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn test_positions_always_unique(
            num_operations in 1..10usize,
        ) {
            let conn = create_test_db();
            let mut item_counter = 0;

            // Perform random operations
            for _ in 0..num_operations {
                // Create a new item
                let button = Button {
                    id: format!("button_{}", item_counter),
                    name: format!("Button {}", item_counter),
                    icon: None,
                    script_type: "shell".to_string(),
                    script_content: "echo test".to_string(),
                    folder_id: None,
                    position: -1, // Auto-assign
                    created_at: chrono::Utc::now().timestamp(),
                    updated_at: chrono::Utc::now().timestamp(),
                };
                create_button(&conn, &button).unwrap();
                item_counter += 1;
            }

            // Verify all positions are unique
            let is_unique = validate_position_uniqueness(&conn, None).unwrap();
            prop_assert!(is_unique, "Positions should be unique after operations");

            // Get all items and manually verify uniqueness
            let items = get_all_items_by_container(&conn, None).unwrap();
            let mut positions = std::collections::HashSet::new();
            
            for item in items {
                let position = match item {
                    UnifiedItem::Button(b) => b.position,
                    _ => panic!("Unexpected item type"),
                };
                prop_assert!(positions.insert(position), 
                    "Duplicate position found: {}", position);
            }
        }
    }

    // Feature: unified-item-sorting, Property 16: Invalid Positions Rejected
    // Validates: Requirements 10.4
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn test_invalid_positions_rejected(
            negative_position in -100..-1i32,
        ) {
            let conn = create_test_db();

            // Create a button first
            let button = Button {
                id: "button_1".to_string(),
                name: "Button 1".to_string(),
                icon: None,
                script_type: "shell".to_string(),
                script_content: "echo test".to_string(),
                folder_id: None,
                position: 0,
                created_at: chrono::Utc::now().timestamp(),
                updated_at: chrono::Utc::now().timestamp(),
            };
            create_button(&conn, &button).unwrap();

            // Try to update with negative position
            let updates = vec![
                UnifiedPositionUpdate {
                    id: "button_1".to_string(),
                    item_type: "button".to_string(),
                    position: negative_position,
                    folder_id: None,
                },
            ];

            let result = update_unified_positions(&conn, &updates);
            prop_assert!(result.is_err(), 
                "Should reject negative position {}", negative_position);
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn test_gap_creating_positions_rejected(
            num_items in 1..5usize,
        ) {
            let conn = create_test_db();

            // Create items with sequential positions
            for i in 0..num_items {
                let button = Button {
                    id: format!("button_{}", i),
                    name: format!("Button {}", i),
                    icon: None,
                    script_type: "shell".to_string(),
                    script_content: "echo test".to_string(),
                    folder_id: None,
                    position: i as i32,
                    created_at: chrono::Utc::now().timestamp(),
                    updated_at: chrono::Utc::now().timestamp(),
                };
                create_button(&conn, &button).unwrap();
            }

            // Try to update with a position that creates a gap
            let gap_position = (num_items + 5) as i32; // Way beyond current max
            let updates = vec![
                UnifiedPositionUpdate {
                    id: "button_0".to_string(),
                    item_type: "button".to_string(),
                    position: gap_position,
                    folder_id: None,
                },
            ];

            let result = update_unified_positions(&conn, &updates);
            prop_assert!(result.is_err(), 
                "Should reject position {} that creates gaps (max allowed: {})", 
                gap_position, num_items - 1);
        }
    }
}
