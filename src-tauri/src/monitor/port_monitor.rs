use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

/// Port monitor for checking if a port is open/listening
pub struct PortMonitor;

impl PortMonitor {
    /// Create a new PortMonitor
    pub fn new() -> Self {
        Self
    }

    /// Check if a port is open on a given host
    /// Returns true if the port is open (accepting connections), false otherwise
    pub fn check_port(&self, host: &str, port: u16) -> bool {
        self.check_port_with_timeout(host, port, Duration::from_secs(3))
    }

    /// Check if a port is open with a custom timeout
    pub fn check_port_with_timeout(&self, host: &str, port: u16, timeout: Duration) -> bool {
        let address = format!("{}:{}", host, port);

        // Try to resolve the address
        let socket_addrs = match address.to_socket_addrs() {
            Ok(addrs) => addrs,
            Err(_) => return false,
        };

        // Try to connect to any of the resolved addresses
        for addr in socket_addrs {
            match TcpStream::connect_timeout(&addr, timeout) {
                Ok(_) => return true,
                Err(_) => continue,
            }
        }

        false
    }

    /// Get detailed information about a port check (for logging/debugging)
    pub fn get_port_info(&self, host: &str, port: u16) -> String {
        let is_open = self.check_port(host, port);

        if is_open {
            format!("Port {}:{} is OPEN (accepting connections)", host, port)
        } else {
            format!("Port {}:{} is CLOSED or unreachable", host, port)
        }
    }
}

impl Default for PortMonitor {
    fn default() -> Self {
        Self::new()
    }
}

/// Parse port target string
/// Format: "host:port" or just "port" (defaults to localhost)
pub fn parse_port_target(target: &str) -> Result<(String, u16), String> {
    if let Some((host, port_str)) = target.rsplit_once(':') {
        // Has host:port format
        let port = port_str.parse::<u16>()
            .map_err(|_| format!("Invalid port number: {}", port_str))?;
        Ok((host.to_string(), port))
    } else {
        // Just port number, default to localhost
        let port = target.parse::<u16>()
            .map_err(|_| format!("Invalid port number: {}", target))?;
        Ok(("127.0.0.1".to_string(), port))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_port_target() {
        // Test with host:port
        let (host, port) = parse_port_target("localhost:8080").unwrap();
        assert_eq!(host, "localhost");
        assert_eq!(port, 8080);

        // Test with just port
        let (host, port) = parse_port_target("3000").unwrap();
        assert_eq!(host, "127.0.0.1");
        assert_eq!(port, 3000);

        // Test with IP:port
        let (host, port) = parse_port_target("192.168.1.1:80").unwrap();
        assert_eq!(host, "192.168.1.1");
        assert_eq!(port, 80);

        // Test invalid port
        assert!(parse_port_target("invalid").is_err());
        assert!(parse_port_target("host:invalid").is_err());
    }

    #[test]
    fn test_port_monitor() {
        let monitor = PortMonitor::new();

        // Test checking a port (this will likely be closed)
        let is_open = monitor.check_port("127.0.0.1", 9999);
        // We can't assert the result since we don't know if the port is open
        // Just make sure it doesn't panic
        println!("Port 9999 open: {}", is_open);
    }
}
