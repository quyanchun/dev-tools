use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Button {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub script_type: String,
    pub script_content: String,
    pub folder_id: Option<String>,
    pub position: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub position: i32,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Monitor {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub monitor_type: String,
    pub target: String,
    pub check_interval: i32,
    pub expected_result: Option<String>,
    pub alert_on_failure: bool,
    pub is_active: bool,
    pub last_check_time: Option<i64>,
    pub last_status: Option<String>,
    pub folder_id: Option<String>,
    pub position: i32,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub button_id: Option<String>,
    pub monitor_id: Option<String>,
    pub level: String,
    pub message: String,
    pub timestamp: i64,
}
