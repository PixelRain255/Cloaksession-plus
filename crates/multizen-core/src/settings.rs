use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BrowserEngine {
    Cft,
    #[default]
    Cloakbrowser,
    Chromix,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub mcp_http_enabled: bool,
    pub mcp_http_port: u16,
    pub browser_engine: BrowserEngine,
    #[serde(default)]
    pub browser_binary_path: Option<String>,
    pub skip_browser_download: bool,
    pub auto_update: bool,
    pub usage_reporting: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".into(),
            mcp_http_enabled: true,
            mcp_http_port: 7777,
            browser_engine: BrowserEngine::Cloakbrowser,
            browser_binary_path: None,
            skip_browser_download: false,
            auto_update: false,
            usage_reporting: false,
        }
    }
}

/// Normalizes a browser binary path. If the path is a directory (such as an
/// unzipped Chromix folder), resolves to `chrome.exe` (or `cloakbrowser.exe`) inside it.
pub fn normalize_browser_binary_path(path: impl AsRef<Path>) -> PathBuf {
    let p = path.as_ref();
    if p.as_os_str().is_empty() {
        return PathBuf::new();
    }
    let p_trimmed = PathBuf::from(p.to_string_lossy().trim());
    let p = p_trimmed.as_path();
    if p.is_dir() {
        let chrome = p.join("chrome.exe");
        if chrome.is_file() {
            return chrome;
        }
        let cloak = p.join("cloakbrowser.exe");
        if cloak.is_file() {
            return cloak;
        }
        // Check direct child directories in case archive was extracted into a subfolder
        if let Ok(entries) = std::fs::read_dir(p) {
            for entry in entries.flatten() {
                let sub = entry.path();
                if sub.is_dir() {
                    let sub_chrome = sub.join("chrome.exe");
                    if sub_chrome.is_file() {
                        return sub_chrome;
                    }
                    let sub_cloak = sub.join("cloakbrowser.exe");
                    if sub_cloak.is_file() {
                        return sub_cloak;
                    }
                }
            }
        }
        #[cfg(target_os = "windows")]
        {
            return chrome;
        }
        #[cfg(not(target_os = "windows"))]
        {
            let chrome_unix = p.join("chrome");
            if chrome_unix.is_file() {
                return chrome_unix;
            }
            let cloak_unix = p.join("cloakbrowser");
            if cloak_unix.is_file() {
                return cloak_unix;
            }
            return chrome_unix;
        }
    }
    if p.is_file() {
        return p.to_path_buf();
    }
    let chrome = p.join("chrome.exe");
    if chrome.is_file() {
        return chrome;
    }
    let path_str = p.to_string_lossy();
    if path_str.ends_with('/') || path_str.ends_with('\\') {
        #[cfg(target_os = "windows")]
        return p.join("chrome.exe");
        #[cfg(not(target_os = "windows"))]
        return p.join("chrome");
    }
    p.to_path_buf()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn browser_engine_serde_roundtrip() {
        assert_eq!(
            serde_json::to_string(&BrowserEngine::Chromix).unwrap(),
            "\"chromix\""
        );
        assert_eq!(
            serde_json::to_string(&BrowserEngine::Cloakbrowser).unwrap(),
            "\"cloakbrowser\""
        );
        assert_eq!(
            serde_json::to_string(&BrowserEngine::Cft).unwrap(),
            "\"cft\""
        );

        assert_eq!(
            serde_json::from_str::<BrowserEngine>("\"chromix\"").unwrap(),
            BrowserEngine::Chromix
        );
        assert_eq!(
            serde_json::from_str::<BrowserEngine>("\"cloakbrowser\"").unwrap(),
            BrowserEngine::Cloakbrowser
        );
        assert_eq!(
            serde_json::from_str::<BrowserEngine>("\"cft\"").unwrap(),
            BrowserEngine::Cft
        );
    }

    #[test]
    fn normalize_path_with_chrome_in_directory() {
        let temp = std::env::temp_dir().join("test_chromix_dir_normalize");
        let _ = std::fs::create_dir_all(&temp);
        let chrome_file = temp.join("chrome.exe");
        std::fs::write(&chrome_file, b"").unwrap();

        let normalized = normalize_browser_binary_path(&temp);
        assert_eq!(normalized, chrome_file);

        let normalized_file = normalize_browser_binary_path(&chrome_file);
        assert_eq!(normalized_file, chrome_file);

        let _ = std::fs::remove_dir_all(&temp);
    }
}
