use sysinfo::{Pid, System};

/// Process target type - can match by name or specific PID
#[derive(Debug, Clone)]
pub enum ProcessTarget {
    Name(String),  // Match by process name (e.g., "node", "java")
    Pid(u32),      // Match by specific process ID
}

impl ProcessTarget {
    /// Parse a target string into ProcessTarget
    /// If the string is a number, treat it as PID, otherwise as name
    pub fn from_string(target: &str) -> Self {
        if let Ok(pid) = target.parse::<u32>() {
            ProcessTarget::Pid(pid)
        } else {
            ProcessTarget::Name(target.to_string())
        }
    }

    /// Convert ProcessTarget to string for storage
    pub fn to_string(&self) -> String {
        match self {
            ProcessTarget::Name(name) => name.clone(),
            ProcessTarget::Pid(pid) => pid.to_string(),
        }
    }
}

/// Process monitor for checking if processes are running
pub struct ProcessMonitor {
    system: System,
}

impl ProcessMonitor {
    /// Create a new ProcessMonitor
    pub fn new() -> Self {
        Self {
            system: System::new_all(),
        }
    }

    /// Check if a process is running based on the target
    /// Returns true if the process is found, false otherwise
    pub fn check_process(&mut self, target: &ProcessTarget) -> bool {
        // Refresh the process list
        self.system.refresh_processes();

        match target {
            ProcessTarget::Name(name) => {
                // Search for process by name
                // Returns true if at least one process with this name exists
                self.system
                    .processes()
                    .values()
                    .any(|process| {
                        let process_name = process.name();
                        process_name.to_lowercase().contains(&name.to_lowercase())
                    })
            }
            ProcessTarget::Pid(pid) => {
                // Check if specific PID exists
                self.system.process(Pid::from_u32(*pid)).is_some()
            }
        }
    }

    /// Get detailed information about a process (for logging/debugging)
    pub fn get_process_info(&mut self, target: &ProcessTarget) -> Option<String> {
        self.system.refresh_processes();

        match target {
            ProcessTarget::Name(name) => {
                let processes: Vec<_> = self
                    .system
                    .processes()
                    .values()
                    .filter(|p| {
                        let process_name = p.name();
                        process_name.to_lowercase().contains(&name.to_lowercase())
                    })
                    .collect();

                if processes.is_empty() {
                    None
                } else {
                    Some(format!(
                        "Found {} process(es) matching '{}': PIDs [{}]",
                        processes.len(),
                        name,
                        processes
                            .iter()
                            .map(|p| p.pid().to_string())
                            .collect::<Vec<_>>()
                            .join(", ")
                    ))
                }
            }
            ProcessTarget::Pid(pid) => {
                if let Some(process) = self.system.process(Pid::from_u32(*pid)) {
                    let process_name = process.name();
                    Some(format!(
                        "Process PID {} ({}): running",
                        pid,
                        process_name
                    ))
                } else {
                    None
                }
            }
        }
    }
}

impl Default for ProcessMonitor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_target_from_string() {
        // Test PID parsing
        let target = ProcessTarget::from_string("1234");
        assert!(matches!(target, ProcessTarget::Pid(1234)));

        // Test name parsing
        let target = ProcessTarget::from_string("node");
        assert!(matches!(target, ProcessTarget::Name(ref name) if name == "node"));
    }

    #[test]
    fn test_process_target_to_string() {
        let target = ProcessTarget::Pid(1234);
        assert_eq!(target.to_string(), "1234");

        let target = ProcessTarget::Name("node".to_string());
        assert_eq!(target.to_string(), "node");
    }
}
