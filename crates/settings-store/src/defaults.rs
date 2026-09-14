use std::path::{Path, PathBuf};

use multizen_core::{normalize_browser_binary_path, AppSettings, BrowserEngine, Result};
use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawSettings {
    theme: Option<String>,
    mcp_http_enabled: Option<bool>,
    mcp_http_port: Option<u16>,
    browser_engine: Option<String>,
    browser_binary_path: Option<String>,
    skip_browser_download: Option<bool>,
    auto_update: Option<bool>,
    usage_reporting: Option<bool>,
}

pub struct SettingsStore {
    json_path: PathBuf,
    cache: Option<AppSettings>,
}

impl SettingsStore {
    pub fn new(json_path: &Path) -> Self {
        if let Some(parent) = json_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        Self {
            json_path: json_path.to_path_buf(),
            cache: None,
        }
    }

    pub fn load(&mut self) -> Result<AppSettings> {
        if let Some(c) = &self.cache {
            return Ok(c.clone());
        }
        let raw: RawSettings = match std::fs::read_to_string(&self.json_path) {
            Ok(txt) => serde_json::from_str(&txt).unwrap_or_default(),
            Err(_) => RawSettings::default(),
        };
        let mut merged = AppSettings::default();
        if let Some(v) = raw.theme {
            merged.theme = v;
        }
        if let Some(v) = raw.mcp_http_enabled {
            merged.mcp_http_enabled = v;
        }
        if let Some(v) = raw.mcp_http_port {
            merged.mcp_http_port = v;
        }
        merged.browser_engine = match raw.browser_engine.as_deref() {
            Some("cft") => BrowserEngine::Cft,
            Some("cloakbrowser") => BrowserEngine::Cloakbrowser,
            Some("chromix") => BrowserEngine::Chromix,
            _ => BrowserEngine::default(),
        };
        merged.browser_binary_path = raw
            .browser_binary_path
            .filter(|s| !s.trim().is_empty())
            .map(|s| {
                normalize_browser_binary_path(s.trim())
                    .to_string_lossy()
                    .to_string()
            });
        merged.skip_browser_download = raw.skip_browser_download.unwrap_or(false);
        merged.auto_update = raw.auto_update.unwrap_or(true);
        merged.usage_reporting = raw.usage_reporting.unwrap_or(false);
        self.cache = Some(merged.clone());
        Ok(merged)
    }

    pub fn update(&mut self, mut patch: AppSettings) -> Result<AppSettings> {
        if let Some(ref path_str) = patch.browser_binary_path {
            if !path_str.trim().is_empty() {
                patch.browser_binary_path = Some(
                    normalize_browser_binary_path(path_str.trim())
                        .to_string_lossy()
                        .to_string(),
                );
            } else {
                patch.browser_binary_path = None;
            }
        }
        let json = serde_json::to_string_pretty(&patch)?;
        std::fs::write(&self.json_path, json)?;
        self.cache = Some(patch.clone());
        Ok(patch)
    }
}

pub fn default_settings_path(dir: &Path) -> PathBuf {
    dir.join("settings.json")
}
