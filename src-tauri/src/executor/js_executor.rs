use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc;

use crate::database::models::LogEntry;
use crate::executor::ExecutionResult;

pub struct JsExecutor {
    pub execution_id: String,
    pub button_id: String,
    pub button_name: String,
    pub script: String,
}

impl JsExecutor {
    pub fn new(execution_id: String, button_id: String, button_name: String, script: String) -> Self {
        Self {
            execution_id,
            button_id,
            button_name,
            script,
        }
    }

    pub async fn execute(
        &self,
        log_sender: mpsc::Sender<LogEntry>,
    ) -> Result<ExecutionResult, String> {
        let start_time = SystemTime::now();

        // Log execution start
        let start_log = LogEntry {
            id: uuid::Uuid::new_v4().to_string(),
            button_id: Some(self.button_id.clone()),
            monitor_id: None,
            level: "info".to_string(),
            message: format!("⚡ 开始执行 JavaScript: {}", self.button_name),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64,
        };
        let _ = log_sender.send(start_log).await;

        // Check if Node.js is available
        if Command::new("node").arg("--version").output().is_err() {
            let error_msg = "❌ Node.js 未安装或不在 PATH 中".to_string();
            let error_log = LogEntry {
                id: uuid::Uuid::new_v4().to_string(),
                button_id: Some(self.button_id.clone()),
                monitor_id: None,
                level: "error".to_string(),
                message: error_msg.clone(),
                timestamp: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64,
            };
            let _ = log_sender.send(error_log).await;
            return Err(error_msg);
        }

        // Execute the JavaScript code
        let mut child = match Command::new("node")
            .arg("-e")
            .arg(&self.script)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(child) => child,
            Err(e) => {
                let error_msg = format!("❌ 执行失败: {}", e);
                let error_log = LogEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    button_id: Some(self.button_id.clone()),
                    monitor_id: None,
                    level: "error".to_string(),
                    message: error_msg.clone(),
                    timestamp: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64,
                };
                let _ = log_sender.send(error_log).await;
                return Err(error_msg);
            }
        };

        // Capture stdout
        if let Some(stdout) = child.stdout.take() {
            let button_id = self.button_id.clone();
            let sender = log_sender.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        let log = LogEntry {
                            id: uuid::Uuid::new_v4().to_string(),
                            button_id: Some(button_id.clone()),
                            monitor_id: None,
                            level: "info".to_string(),
                            message: line,
                            timestamp: SystemTime::now()
                                .duration_since(UNIX_EPOCH)
                                .unwrap()
                                .as_secs() as i64,
                        };
                        let _ = sender.send(log).await;
                    }
                }
            });
        }

        // Capture stderr
        if let Some(stderr) = child.stderr.take() {
            let button_id = self.button_id.clone();
            let sender = log_sender.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        let log = LogEntry {
                            id: uuid::Uuid::new_v4().to_string(),
                            button_id: Some(button_id.clone()),
                            monitor_id: None,
                            level: "error".to_string(),
                            message: line,
                            timestamp: SystemTime::now()
                                .duration_since(UNIX_EPOCH)
                                .unwrap()
                                .as_secs() as i64,
                        };
                        let _ = sender.send(log).await;
                    }
                }
            });
        }

        // Wait for process to complete with timeout
        let timeout = Duration::from_secs(30);
        let wait_result = tokio::time::timeout(timeout, tokio::task::spawn_blocking(move || {
            child.wait()
        }))
        .await;

        let duration = start_time.elapsed().unwrap_or(Duration::from_secs(0));

        match wait_result {
            Ok(Ok(Ok(status))) => {
                let success = status.success();
                let exit_code = status.code();

                let result_log = LogEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    button_id: Some(self.button_id.clone()),
                    monitor_id: None,
                    level: if success { "info".to_string() } else { "error".to_string() },
                    message: if success {
                        format!("✅ 执行成功 (耗时: {:.2}秒)", duration.as_secs_f64())
                    } else {
                        format!(
                            "❌ 执行失败 (退出码: {}, 耗时: {:.2}秒)",
                            exit_code.unwrap_or(-1),
                            duration.as_secs_f64()
                        )
                    },
                    timestamp: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64,
                };
                let _ = log_sender.send(result_log).await;

                Ok(ExecutionResult {
                    success,
                    exit_code,
                    duration_ms: duration.as_millis() as u64,
                    error: None,
                })
            }
            Ok(Ok(Err(e))) => {
                let error_msg = format!("❌ 等待进程失败: {}", e);
                let error_log = LogEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    button_id: Some(self.button_id.clone()),
                    monitor_id: None,
                    level: "error".to_string(),
                    message: error_msg.clone(),
                    timestamp: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64,
                };
                let _ = log_sender.send(error_log).await;

                Ok(ExecutionResult {
                    success: false,
                    exit_code: None,
                    duration_ms: duration.as_millis() as u64,
                    error: Some(error_msg),
                })
            }
            Ok(Err(e)) => {
                let error_msg = format!("❌ 任务执行失败: {}", e);
                let error_log = LogEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    button_id: Some(self.button_id.clone()),
                    monitor_id: None,
                    level: "error".to_string(),
                    message: error_msg.clone(),
                    timestamp: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64,
                };
                let _ = log_sender.send(error_log).await;

                Ok(ExecutionResult {
                    success: false,
                    exit_code: None,
                    duration_ms: duration.as_millis() as u64,
                    error: Some(error_msg),
                })
            }
            Err(_) => {
                let error_msg = format!("⏱️ 执行超时 (超过 {} 秒)", timeout.as_secs());
                let error_log = LogEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    button_id: Some(self.button_id.clone()),
                    monitor_id: None,
                    level: "error".to_string(),
                    message: error_msg.clone(),
                    timestamp: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64,
                };
                let _ = log_sender.send(error_log).await;

                Ok(ExecutionResult {
                    success: false,
                    exit_code: None,
                    duration_ms: duration.as_millis() as u64,
                    error: Some(error_msg),
                })
            }
        }
    }
}
