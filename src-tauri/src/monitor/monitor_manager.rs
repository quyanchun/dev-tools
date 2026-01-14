use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time;
use tauri::{Emitter, Manager};

use crate::database::models::{LogEntry, Monitor};
use crate::database::repository;
use super::api_monitor::{ApiCheckConfig, ApiMonitor};
use super::process_monitor::{ProcessMonitor, ProcessTarget};
use super::port_monitor::{PortMonitor, parse_port_target};

/// Monitor status for event emission
#[derive(Debug, Clone, serde::Serialize)]
pub struct MonitorStatus {
    pub monitor_id: String,
    pub status: String,        // "running", "stopped", "error", "checking"
    pub last_check_time: i64,
    pub message: Option<String>,
}

/// Manager for all active monitors
pub struct MonitorManager {
    active_monitors: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
}

impl MonitorManager {
    /// Create a new MonitorManager
    pub fn new() -> Self {
        Self {
            active_monitors: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Start a monitor task
    pub async fn start_monitor(
        &self,
        monitor: Monitor,
        app_handle: tauri::AppHandle,
        db_path: String,
    ) -> Result<(), String> {
        let monitor_id = monitor.id.clone();

        // Check if monitor is already running
        let mut monitors = self.active_monitors.lock().await;
        if monitors.contains_key(&monitor_id) {
            return Err("Monitor is already running".to_string());
        }

        // Clone data for the async task
        let monitor_clone = monitor.clone();
        let app_handle_clone = app_handle.clone();
        let db_path_clone = db_path.clone();

        // Spawn background task based on monitor type
        let handle = tokio::spawn(async move {
            Self::monitor_loop(monitor_clone, app_handle_clone, db_path_clone).await;
        });

        // Store the task handle
        monitors.insert(monitor_id.clone(), handle);

        // Emit start event
        let _ = app_handle.emit(
            "monitor-status-update",
            MonitorStatus {
                monitor_id: monitor.id.clone(),
                status: "running".to_string(),
                last_check_time: chrono::Utc::now().timestamp(),
                message: Some(format!("Monitor '{}' started", monitor.name)),
            },
        );

        // Log monitor start
        Self::log_monitor_event(
            &db_path,
            &monitor.id,
            "info",
            &format!("Monitor '{}' started", monitor.name),
        )
        .await;

        Ok(())
    }

    /// Stop a monitor task
    pub async fn stop_monitor(&self, monitor_id: &str) -> Result<(), String> {
        let mut monitors = self.active_monitors.lock().await;

        if let Some(handle) = monitors.remove(monitor_id) {
            handle.abort();
            Ok(())
        } else {
            Err("Monitor not found or not running".to_string())
        }
    }

    /// Stop all monitors (called on app shutdown)
    pub async fn stop_all(&self) {
        let mut monitors = self.active_monitors.lock().await;
        for (_, handle) in monitors.drain() {
            handle.abort();
        }
    }

    /// Check if a monitor is running
    pub async fn is_running(&self, monitor_id: &str) -> bool {
        let monitors = self.active_monitors.lock().await;
        monitors.contains_key(monitor_id)
    }

    /// Main monitoring loop
    async fn monitor_loop(monitor: Monitor, app_handle: tauri::AppHandle, db_path: String) {
        let interval = Duration::from_secs(monitor.check_interval as u64);
        let mut interval_timer = time::interval(interval);

        loop {
            interval_timer.tick().await;

            // Emit checking status
            let _ = app_handle.emit(
                "monitor-status-update",
                MonitorStatus {
                    monitor_id: monitor.id.clone(),
                    status: "checking".to_string(),
                    last_check_time: chrono::Utc::now().timestamp(),
                    message: None,
                },
            );

            // Perform check based on monitor type
            let check_result = match monitor.monitor_type.as_str() {
                "process" => Self::check_process(&monitor).await,
                "api" => Self::check_api(&monitor).await,
                "port" => Self::check_port(&monitor).await,
                _ => {
                    eprintln!("Unknown monitor type: {}", monitor.monitor_type);
                    continue;
                }
            };

            let timestamp = chrono::Utc::now().timestamp();

            match check_result {
                Ok(is_healthy) => {
                    let status = if is_healthy { "running" } else { "error" };
                    let message = if is_healthy {
                        format!("Monitor '{}': Check passed", monitor.name)
                    } else {
                        format!("Monitor '{}': Check failed - target not responding", monitor.name)
                    };

                    // Update database status
                    Self::update_db_status(&db_path, &monitor.id, status, timestamp).await;

                    // Emit status update
                    let _ = app_handle.emit(
                        "monitor-status-update",
                        MonitorStatus {
                            monitor_id: monitor.id.clone(),
                            status: status.to_string(),
                            last_check_time: timestamp,
                            message: Some(message.clone()),
                        },
                    );

                    // Log the check result
                    let log_level = if is_healthy { "info" } else { "error" };
                    Self::log_monitor_event(&db_path, &monitor.id, log_level, &message).await;

                    // If alert_on_failure is enabled and check failed, emit alert
                    if !is_healthy && monitor.alert_on_failure {
                        let _ = app_handle.emit(
                            "monitor-alert",
                            MonitorStatus {
                                monitor_id: monitor.id.clone(),
                                status: "alert".to_string(),
                                last_check_time: timestamp,
                                message: Some(format!("ALERT: {}", message)),
                            },
                        );
                    }
                }
                Err(error_msg) => {
                    // Update database status
                    Self::update_db_status(&db_path, &monitor.id, "error", timestamp).await;

                    // Emit error status
                    let _ = app_handle.emit(
                        "monitor-status-update",
                        MonitorStatus {
                            monitor_id: monitor.id.clone(),
                            status: "error".to_string(),
                            last_check_time: timestamp,
                            message: Some(error_msg.clone()),
                        },
                    );

                    // Log the error
                    Self::log_monitor_event(&db_path, &monitor.id, "error", &error_msg).await;

                    // Emit alert if enabled
                    if monitor.alert_on_failure {
                        let _ = app_handle.emit(
                            "monitor-alert",
                            MonitorStatus {
                                monitor_id: monitor.id.clone(),
                                status: "alert".to_string(),
                                last_check_time: timestamp,
                                message: Some(format!("ALERT: {}", error_msg)),
                            },
                        );
                    }
                }
            }
        }
    }

    /// Check process monitor
    async fn check_process(monitor: &Monitor) -> Result<bool, String> {
        let target = ProcessTarget::from_string(&monitor.target);
        let mut process_monitor = ProcessMonitor::new();
        Ok(process_monitor.check_process(&target))
    }

    /// Check API monitor
    async fn check_api(monitor: &Monitor) -> Result<bool, String> {
        // Parse target as JSON config or simple URL
        let config = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&monitor.target) {
            // Parse from JSON
            ApiCheckConfig {
                url: json["url"].as_str().unwrap_or("").to_string(),
                method: json["method"].as_str().unwrap_or("GET").to_string(),
                headers: json["headers"].as_array().map(|arr| {
                    arr.iter()
                        .filter_map(|h| {
                            Some((
                                h["key"].as_str()?.to_string(),
                                h["value"].as_str()?.to_string(),
                            ))
                        })
                        .collect()
                }),
                body: json["body"].as_str().map(|s| s.to_string()),
                expected_content: monitor.expected_result.clone(),
                timeout_secs: 10,
            }
        } else {
            // Simple URL string
            ApiCheckConfig {
                url: monitor.target.clone(),
                method: "GET".to_string(),
                headers: None,
                body: None,
                expected_content: monitor.expected_result.clone(),
                timeout_secs: 10,
            }
        };

        let api_monitor = ApiMonitor::new();
        api_monitor.check_api(&config).await
    }

    /// Check port monitor
    async fn check_port(monitor: &Monitor) -> Result<bool, String> {
        // Parse target as "host:port" or just "port"
        let (host, port) = parse_port_target(&monitor.target)
            .map_err(|e| format!("Invalid port target: {}", e))?;

        let port_monitor = PortMonitor::new();
        Ok(port_monitor.check_port(&host, port))
    }

    /// Update monitor status in database
    async fn update_db_status(db_path: &str, monitor_id: &str, status: &str, timestamp: i64) {
        if let Ok(conn) = rusqlite::Connection::open(db_path) {
            let _ = repository::update_monitor_status(&conn, monitor_id, status, timestamp);
        }
    }

    /// Log monitor event to database
    async fn log_monitor_event(db_path: &str, monitor_id: &str, level: &str, message: &str) {
        if let Ok(conn) = rusqlite::Connection::open(db_path) {
            let log = LogEntry {
                id: uuid::Uuid::new_v4().to_string(),
                button_id: None,
                monitor_id: Some(monitor_id.to_string()),
                level: level.to_string(),
                message: message.to_string(),
                timestamp: chrono::Utc::now().timestamp(),
            };
            let _ = repository::create_log(&conn, &log);
        }
    }
}

impl Default for MonitorManager {
    fn default() -> Self {
        Self::new()
    }
}
