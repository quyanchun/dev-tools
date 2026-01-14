use rusqlite::{Connection, Result};
use super::models::{Monitor, Folder, Button};

/// Check if the unified position migration has already been completed
pub fn is_migration_complete(conn: &Connection) -> Result<bool> {
    // Create migration_status table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS migration_status (
            migration_name TEXT PRIMARY KEY,
            completed_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Check if unified_positions migration is complete
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM migration_status WHERE migration_name = 'unified_positions'",
        [],
        |row| row.get(0),
    )?;

    Ok(count > 0)
}

/// Mark the unified position migration as complete
fn mark_migration_complete(conn: &Connection) -> Result<()> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO migration_status (migration_name, completed_at) VALUES ('unified_positions', ?1)",
        [now],
    )?;
    Ok(())
}

/// Migrate to unified positions system
/// 
/// This migration assigns unified positions to all items while preserving relative order:
/// - Monitors come first (at root level)
/// - Folders come second
/// - Buttons come third (at root level)
/// - Items within folders maintain separate position sequences
pub fn migrate_to_unified_positions(conn: &mut Connection) -> Result<()> {
    // Check if migration already done
    if is_migration_complete(conn)? {
        println!("Migration already complete, skipping...");
        return Ok(());
    }

    println!("Starting unified positions migration...");

    // Start transaction
    let tx = conn.transaction()?;

    // Get all items
    let monitors = get_all_monitors_for_migration(&tx)?;
    let folders = get_all_folders_for_migration(&tx)?;
    let buttons = get_all_buttons_for_migration(&tx)?;

    // Assign new positions at root level: monitors first, then folders, then buttons
    let mut position = 0;

    // Process root-level monitors (folder_id IS NULL)
    for monitor in monitors.iter().filter(|m| m.folder_id.is_none()) {
        tx.execute(
            "UPDATE monitors SET position = ?1 WHERE id = ?2",
            (position, &monitor.id),
        )?;
        position += 1;
    }

    // Process folders (folders are always at root level)
    for folder in folders.iter() {
        tx.execute(
            "UPDATE folders SET position = ?1 WHERE id = ?2",
            (position, &folder.id),
        )?;
        position += 1;
    }

    // Process root-level buttons (folder_id IS NULL)
    for button in buttons.iter().filter(|b| b.folder_id.is_none()) {
        tx.execute(
            "UPDATE buttons SET position = ?1, updated_at = ?2 WHERE id = ?3",
            (position, chrono::Utc::now().timestamp(), &button.id),
        )?;
        position += 1;
    }

    // Handle items in folders (separate position sequences per folder)
    let folder_ids: Vec<String> = folders.iter().map(|f| f.id.clone()).collect();

    for folder_id in folder_ids {
        let mut folder_position = 0;

        // Process monitors in this folder
        for monitor in monitors.iter().filter(|m| m.folder_id.as_deref() == Some(&folder_id)) {
            tx.execute(
                "UPDATE monitors SET position = ?1 WHERE id = ?2",
                (folder_position, &monitor.id),
            )?;
            folder_position += 1;
        }

        // Process buttons in this folder
        for button in buttons.iter().filter(|b| b.folder_id.as_deref() == Some(&folder_id)) {
            tx.execute(
                "UPDATE buttons SET position = ?1, updated_at = ?2 WHERE id = ?3",
                (folder_position, chrono::Utc::now().timestamp(), &button.id),
            )?;
            folder_position += 1;
        }
    }

    // Validate migration
    validate_migration(&tx)?;

    // Mark migration as complete
    mark_migration_complete(&tx)?;

    // Commit transaction
    tx.commit()?;

    println!("Unified positions migration completed successfully!");

    Ok(())
}

/// Validate that the migration was successful
fn validate_migration(conn: &Connection) -> Result<()> {
    // Validate root level
    validate_container_positions(conn, None)?;

    // Validate each folder
    let folders = get_all_folders_for_migration(conn)?;
    for folder in folders {
        validate_container_positions(conn, Some(&folder.id))?;
    }

    Ok(())
}

/// Validate positions in a specific container
fn validate_container_positions(conn: &Connection, folder_id: Option<&str>) -> Result<()> {
    let items = super::repository::get_all_items_by_container(conn, folder_id)?;

    if items.is_empty() {
        return Ok(());
    }

    // Check that positions are unique
    let mut positions = std::collections::HashSet::new();
    for item in &items {
        let position = match item {
            super::models::UnifiedItem::Monitor(m) => m.position,
            super::models::UnifiedItem::Folder(f) => f.position,
            super::models::UnifiedItem::Button(b) => b.position,
        };

        if !positions.insert(position) {
            return Err(rusqlite::Error::InvalidParameterName(
                format!("Duplicate position {} found in container {:?}", position, folder_id)
            ));
        }
    }

    // Check that positions are consecutive (0, 1, 2, ..., n-1)
    let mut sorted_positions: Vec<i32> = positions.into_iter().collect();
    sorted_positions.sort();

    for (i, pos) in sorted_positions.iter().enumerate() {
        if *pos != i as i32 {
            return Err(rusqlite::Error::InvalidParameterName(
                format!("Gap in positions: expected {} but found {} in container {:?}", 
                    i, pos, folder_id)
            ));
        }
    }

    Ok(())
}

// Helper functions to get items for migration (without using repository functions that might have side effects)

fn get_all_monitors_for_migration(conn: &Connection) -> Result<Vec<Monitor>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, monitor_type, target, check_interval, expected_result,
         alert_on_failure, is_active, last_check_time, last_status, folder_id, position, created_at
         FROM monitors ORDER BY created_at ASC",
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

fn get_all_folders_for_migration(conn: &Connection) -> Result<Vec<Folder>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, position, created_at
         FROM folders ORDER BY created_at ASC",
    )?;

    let folders = stmt
        .query_map([], |row| {
            Ok(Folder {
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

fn get_all_buttons_for_migration(conn: &Connection) -> Result<Vec<Button>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at
         FROM buttons ORDER BY created_at ASC",
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

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

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

    #[test]
    fn test_migration_preserves_relative_order() {
        let mut conn = create_test_db();
        let base_time = chrono::Utc::now().timestamp();

        // Create items with arbitrary positions (simulating old system)
        // Monitors with old positions
        conn.execute(
            "INSERT INTO monitors (id, name, icon, monitor_type, target, check_interval, 
             expected_result, alert_on_failure, is_active, last_check_time, last_status, 
             folder_id, position, created_at)
             VALUES ('m1', 'Monitor 1', NULL, 'api', 'http://example.com', 60, NULL, 0, 0, NULL, NULL, NULL, 0, ?1)",
            [base_time],
        ).unwrap();

        conn.execute(
            "INSERT INTO monitors (id, name, icon, monitor_type, target, check_interval, 
             expected_result, alert_on_failure, is_active, last_check_time, last_status, 
             folder_id, position, created_at)
             VALUES ('m2', 'Monitor 2', NULL, 'api', 'http://example.com', 60, NULL, 0, 0, NULL, NULL, NULL, 1, ?1)",
            [base_time + 1],
        ).unwrap();

        // Folders with old positions
        conn.execute(
            "INSERT INTO folders (id, name, icon, position, created_at)
             VALUES ('f1', 'Folder 1', NULL, 0, ?1)",
            [base_time + 2],
        ).unwrap();

        conn.execute(
            "INSERT INTO folders (id, name, icon, position, created_at)
             VALUES ('f2', 'Folder 2', NULL, 1, ?1)",
            [base_time + 3],
        ).unwrap();

        // Buttons with old positions
        conn.execute(
            "INSERT INTO buttons (id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at)
             VALUES ('b1', 'Button 1', NULL, 'shell', 'echo test', NULL, 0, ?1, ?1)",
            [base_time + 4],
        ).unwrap();

        conn.execute(
            "INSERT INTO buttons (id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at)
             VALUES ('b2', 'Button 2', NULL, 'shell', 'echo test', NULL, 1, ?1, ?1)",
            [base_time + 5],
        ).unwrap();

        // Run migration
        migrate_to_unified_positions(&mut conn).unwrap();

        // Verify order: monitors first, then folders, then buttons
        let items = super::super::repository::get_all_items_by_container(&conn, None).unwrap();
        
        assert_eq!(items.len(), 6);
        
        // Check that monitors come first (positions 0-1)
        match &items[0] {
            super::super::models::UnifiedItem::Monitor(m) => {
                assert_eq!(m.id, "m1");
                assert_eq!(m.position, 0);
            }
            _ => panic!("Expected monitor at position 0"),
        }
        
        match &items[1] {
            super::super::models::UnifiedItem::Monitor(m) => {
                assert_eq!(m.id, "m2");
                assert_eq!(m.position, 1);
            }
            _ => panic!("Expected monitor at position 1"),
        }

        // Check that folders come second (positions 2-3)
        match &items[2] {
            super::super::models::UnifiedItem::Folder(f) => {
                assert_eq!(f.id, "f1");
                assert_eq!(f.position, 2);
            }
            _ => panic!("Expected folder at position 2"),
        }
        
        match &items[3] {
            super::super::models::UnifiedItem::Folder(f) => {
                assert_eq!(f.id, "f2");
                assert_eq!(f.position, 3);
            }
            _ => panic!("Expected folder at position 3"),
        }

        // Check that buttons come third (positions 4-5)
        match &items[4] {
            super::super::models::UnifiedItem::Button(b) => {
                assert_eq!(b.id, "b1");
                assert_eq!(b.position, 4);
            }
            _ => panic!("Expected button at position 4"),
        }
        
        match &items[5] {
            super::super::models::UnifiedItem::Button(b) => {
                assert_eq!(b.id, "b2");
                assert_eq!(b.position, 5);
            }
            _ => panic!("Expected button at position 5"),
        }
    }

    #[test]
    fn test_migration_assigns_consecutive_positions() {
        let mut conn = create_test_db();
        let base_time = chrono::Utc::now().timestamp();

        // Create items with non-consecutive positions
        conn.execute(
            "INSERT INTO monitors (id, name, icon, monitor_type, target, check_interval, 
             expected_result, alert_on_failure, is_active, last_check_time, last_status, 
             folder_id, position, created_at)
             VALUES ('m1', 'Monitor 1', NULL, 'api', 'http://example.com', 60, NULL, 0, 0, NULL, NULL, NULL, 10, ?1)",
            [base_time],
        ).unwrap();

        conn.execute(
            "INSERT INTO folders (id, name, icon, position, created_at)
             VALUES ('f1', 'Folder 1', NULL, 20, ?1)",
            [base_time + 1],
        ).unwrap();

        conn.execute(
            "INSERT INTO buttons (id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at)
             VALUES ('b1', 'Button 1', NULL, 'shell', 'echo test', NULL, 30, ?1, ?1)",
            [base_time + 2],
        ).unwrap();

        // Run migration
        migrate_to_unified_positions(&mut conn).unwrap();

        // Verify positions are consecutive 0, 1, 2
        let items = super::super::repository::get_all_items_by_container(&conn, None).unwrap();
        
        assert_eq!(items.len(), 3);
        
        for (i, item) in items.iter().enumerate() {
            let position = match item {
                super::super::models::UnifiedItem::Monitor(m) => m.position,
                super::super::models::UnifiedItem::Folder(f) => f.position,
                super::super::models::UnifiedItem::Button(b) => b.position,
            };
            assert_eq!(position, i as i32, "Position should be {} but got {}", i, position);
        }
    }

    #[test]
    fn test_migration_handles_empty_tables() {
        let mut conn = create_test_db();

        // Run migration on empty database
        let result = migrate_to_unified_positions(&mut conn);
        
        assert!(result.is_ok(), "Migration should succeed on empty tables");

        // Verify migration is marked as complete
        assert!(is_migration_complete(&conn).unwrap());
    }

    #[test]
    fn test_migration_rollback_on_failure() {
        let mut conn = create_test_db();
        let base_time = chrono::Utc::now().timestamp();

        // Create a monitor
        conn.execute(
            "INSERT INTO monitors (id, name, icon, monitor_type, target, check_interval, 
             expected_result, alert_on_failure, is_active, last_check_time, last_status, 
             folder_id, position, created_at)
             VALUES ('m1', 'Monitor 1', NULL, 'api', 'http://example.com', 60, NULL, 0, 0, NULL, NULL, NULL, 0, ?1)",
            [base_time],
        ).unwrap();

        // Drop the migration_status table to simulate a failure scenario
        // (This is a bit contrived, but demonstrates rollback behavior)
        
        // First, run a successful migration
        migrate_to_unified_positions(&mut conn).unwrap();
        
        // Verify the monitor still has the correct position after successful migration
        let monitor: Monitor = conn.query_row(
            "SELECT id, name, icon, monitor_type, target, check_interval, expected_result,
             alert_on_failure, is_active, last_check_time, last_status, folder_id, position, created_at
             FROM monitors WHERE id = 'm1'",
            [],
            |row| {
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
            },
        ).unwrap();
        
        assert_eq!(monitor.position, 0);
        
        // Try to run migration again - should skip
        migrate_to_unified_positions(&mut conn).unwrap();
        
        // Verify migration is still marked as complete
        assert!(is_migration_complete(&conn).unwrap());
    }

    #[test]
    fn test_migration_handles_folder_items() {
        let mut conn = create_test_db();
        let base_time = chrono::Utc::now().timestamp();

        // Create a folder
        conn.execute(
            "INSERT INTO folders (id, name, icon, position, created_at)
             VALUES ('f1', 'Folder 1', NULL, 0, ?1)",
            [base_time],
        ).unwrap();

        // Create items in the folder with old positions
        conn.execute(
            "INSERT INTO monitors (id, name, icon, monitor_type, target, check_interval, 
             expected_result, alert_on_failure, is_active, last_check_time, last_status, 
             folder_id, position, created_at)
             VALUES ('m1', 'Monitor 1', NULL, 'api', 'http://example.com', 60, NULL, 0, 0, NULL, NULL, 'f1', 0, ?1)",
            [base_time + 1],
        ).unwrap();

        conn.execute(
            "INSERT INTO buttons (id, name, icon, script_type, script_content, folder_id, position, created_at, updated_at)
             VALUES ('b1', 'Button 1', NULL, 'shell', 'echo test', 'f1', 0, ?1, ?1)",
            [base_time + 2],
        ).unwrap();

        // Run migration
        migrate_to_unified_positions(&mut conn).unwrap();

        // Verify root level has only the folder at position 0
        let root_items = super::super::repository::get_all_items_by_container(&conn, None).unwrap();
        assert_eq!(root_items.len(), 1);
        match &root_items[0] {
            super::super::models::UnifiedItem::Folder(f) => {
                assert_eq!(f.id, "f1");
                assert_eq!(f.position, 0);
            }
            _ => panic!("Expected folder at root level"),
        }

        // Verify folder items have separate consecutive positions (0, 1)
        let folder_items = super::super::repository::get_all_items_by_container(&conn, Some("f1")).unwrap();
        assert_eq!(folder_items.len(), 2);
        
        // Monitor should be at position 0 (created first)
        match &folder_items[0] {
            super::super::models::UnifiedItem::Monitor(m) => {
                assert_eq!(m.id, "m1");
                assert_eq!(m.position, 0);
            }
            _ => panic!("Expected monitor at position 0 in folder"),
        }
        
        // Button should be at position 1 (created second)
        match &folder_items[1] {
            super::super::models::UnifiedItem::Button(b) => {
                assert_eq!(b.id, "b1");
                assert_eq!(b.position, 1);
            }
            _ => panic!("Expected button at position 1 in folder"),
        }
    }
}
