use reqwest::{Client, Method};
use serde_json::Value;
use std::time::Duration;

/// Configuration for API health check
#[derive(Debug, Clone)]
pub struct ApiCheckConfig {
    pub url: String,
    pub method: String,                          // "GET", "POST", "PUT", "DELETE", "PATCH"
    pub headers: Option<Vec<(String, String)>>, // Optional HTTP headers
    pub body: Option<String>,                    // Optional request body
    pub expected_content: Option<String>,        // Optional expected response content
    pub timeout_secs: u64,                       // Request timeout in seconds
}

impl ApiCheckConfig {
    /// Create a simple GET request config
    pub fn get(url: String) -> Self {
        Self {
            url,
            method: "GET".to_string(),
            headers: None,
            body: None,
            expected_content: None,
            timeout_secs: 10,
        }
    }

    /// Create a POST request config with body
    pub fn post(url: String, body: String) -> Self {
        Self {
            url,
            method: "POST".to_string(),
            headers: None,
            body: Some(body),
            expected_content: None,
            timeout_secs: 10,
        }
    }
}

/// API monitor for checking API health
pub struct ApiMonitor {
    client: Client,
}

impl ApiMonitor {
    /// Create a new ApiMonitor with default timeout
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap_or_else(|_| Client::new()),
        }
    }

    /// Check API health based on configuration
    /// Returns Ok(true) if API is healthy, Ok(false) if unhealthy, Err on request failure
    pub async fn check_api(&self, config: &ApiCheckConfig) -> Result<bool, String> {
        // Parse HTTP method
        let method = match config.method.to_uppercase().as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "DELETE" => Method::DELETE,
            "PATCH" => Method::PATCH,
            _ => Method::GET, // Default to GET for unknown methods
        };

        // Build request with custom timeout
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_secs))
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

        let mut request = client.request(method, &config.url);

        // Add custom headers if provided
        if let Some(headers) = &config.headers {
            for (key, value) in headers {
                request = request.header(key, value);
            }
        }

        // Add request body if provided (for POST/PUT/PATCH)
        if let Some(body) = &config.body {
            request = request.body(body.clone());
        }

        // Execute request
        let response = request
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        // Check status code (2xx = success)
        if !response.status().is_success() {
            return Ok(false);
        }

        // Optionally verify response content
        if let Some(expected) = &config.expected_content {
            let body = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response body: {}", e))?;

            // Check if response contains expected content
            return Ok(body.contains(expected));
        }

        // If no content check required, just return success based on status code
        Ok(true)
    }

    /// Get detailed response information (for logging/debugging)
    pub async fn get_response_info(&self, config: &ApiCheckConfig) -> Result<String, String> {
        let method = match config.method.to_uppercase().as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "DELETE" => Method::DELETE,
            "PATCH" => Method::PATCH,
            _ => Method::GET,
        };

        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_secs))
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

        let mut request = client.request(method, &config.url);

        if let Some(headers) = &config.headers {
            for (key, value) in headers {
                request = request.header(key, value);
            }
        }

        if let Some(body) = &config.body {
            request = request.body(body.clone());
        }

        let response = request
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "<unable to read body>".to_string());

        Ok(format!(
            "Status: {} | Body preview: {}",
            status,
            if body.len() > 100 {
                format!("{}...", &body[..100])
            } else {
                body
            }
        ))
    }
}

impl Default for ApiMonitor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_check_config_get() {
        let config = ApiCheckConfig::get("https://example.com".to_string());
        assert_eq!(config.method, "GET");
        assert_eq!(config.url, "https://example.com");
        assert!(config.body.is_none());
    }

    #[test]
    fn test_api_check_config_post() {
        let config = ApiCheckConfig::post(
            "https://example.com".to_string(),
            r#"{"key":"value"}"#.to_string(),
        );
        assert_eq!(config.method, "POST");
        assert!(config.body.is_some());
    }
}
