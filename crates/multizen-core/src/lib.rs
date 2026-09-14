pub mod error;
pub mod profile;
pub mod settings;

pub use error::{MultizenError, Result};
pub use profile::*;
pub use settings::{normalize_browser_binary_path, AppSettings, BrowserEngine};
