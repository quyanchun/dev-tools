use rusqlite::{Connection, Result};
use super::models::Button;

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
