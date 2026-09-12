//! 本机偏好与调试信息。只做读写、校验枚举、平台自启；不含业务规则。

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Manager};

use crate::error::ShellError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutPrefs {
    pub palette: String,
    pub run: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellPrefs {
    pub theme: String,
    pub accent: String,
    pub font: String,
    pub motion: String,
    pub locale: String,
    pub close_behavior: String,
    pub autostart: bool,
    pub auto_update: bool,
    pub shortcuts: ShortcutPrefs,
}

impl Default for ShellPrefs {
    fn default() -> Self {
        Self {
            theme: "light".into(),
            accent: "terracotta".into(),
            font: "mixed".into(),
            motion: "normal".into(),
            locale: "zh-CN".into(),
            close_behavior: "quit".into(),
            autostart: false,
            auto_update: false,
            shortcuts: ShortcutPrefs {
                palette: "Mod+K".into(),
                run: "Mod+Enter".into(),
            },
        }
    }
}

fn prefs_path(app: &AppHandle) -> Result<PathBuf, ShellError> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| ShellError::Io(e.to_string()))?;
    fs::create_dir_all(&dir).map_err(|e| ShellError::Io(e.to_string()))?;
    Ok(dir.join("prefs.json"))
}

pub fn load(app: &AppHandle) -> ShellPrefs {
    let Ok(path) = prefs_path(app) else {
        return ShellPrefs::default();
    };
    let Ok(raw) = fs::read_to_string(path) else {
        return ShellPrefs::default();
    };
    serde_json::from_str(&raw).unwrap_or_else(|_| ShellPrefs::default())
}

pub fn save(app: &AppHandle, prefs: &ShellPrefs) -> Result<(), ShellError> {
    let path = prefs_path(app)?;
    let body = serde_json::to_string_pretty(prefs).map_err(|e| ShellError::Io(e.to_string()))?;
    fs::write(path, body).map_err(|e| ShellError::Io(e.to_string()))
}

pub fn parse_prefs(value: serde_json::Value) -> Result<ShellPrefs, ShellError> {
    let prefs: ShellPrefs =
        serde_json::from_value(value).map_err(|e| ShellError::InvalidPrefs(e.to_string()))?;
    validate(&prefs)?;
    Ok(prefs)
}

fn validate(prefs: &ShellPrefs) -> Result<(), ShellError> {
    let ok = matches!(prefs.theme.as_str(), "light" | "dark" | "system")
        && matches!(prefs.accent.as_str(), "terracotta" | "ink" | "moss" | "dusk")
        && matches!(prefs.font.as_str(), "song" | "hei" | "mixed")
        && matches!(prefs.motion.as_str(), "normal" | "reduce")
        && matches!(prefs.locale.as_str(), "zh-CN" | "en")
        && matches!(prefs.close_behavior.as_str(), "quit" | "minimize")
        && !prefs.shortcuts.palette.is_empty()
        && !prefs.shortcuts.run.is_empty();
    if ok {
        Ok(())
    } else {
        Err(ShellError::InvalidPrefs("偏好字段不在允许集合内".into()))
    }
}

pub fn apply_autostart(app: &AppHandle, enabled: bool) -> Result<bool, ShellError> {
    if !cfg!(windows) {
        return Ok(false);
    }
    let exe = std::env::current_exe().map_err(|e| ShellError::Io(e.to_string()))?;
    let startup = windows_startup_path()?;
    if enabled {
        let body = format!("@echo off\r\nstart \"\" \"{}\"\r\n", exe.display());
        if let Some(parent) = startup.parent() {
            fs::create_dir_all(parent).map_err(|e| ShellError::Io(e.to_string()))?;
        }
        fs::write(&startup, body).map_err(|e| ShellError::Io(e.to_string()))?;
        append_log(app, &format!("autostart enabled -> {}", startup.display()));
    } else if startup.exists() {
        fs::remove_file(&startup).map_err(|e| ShellError::Io(e.to_string()))?;
        append_log(app, "autostart disabled");
    }
    Ok(true)
}

fn windows_startup_path() -> Result<PathBuf, ShellError> {
    let appdata = std::env::var("APPDATA").map_err(|e| ShellError::Io(e.to_string()))?;
    Ok(PathBuf::from(appdata)
        .join("Microsoft")
        .join("Windows")
        .join("Start Menu")
        .join("Programs")
        .join("Startup")
        .join("Lanius Desktop.bat"))
}

pub fn log_file_path(app: &AppHandle) -> Result<PathBuf, ShellError> {
    let dir = app
        .path()
        .app_log_dir()
        .map_err(|e| ShellError::Io(e.to_string()))?;
    fs::create_dir_all(&dir).map_err(|e| ShellError::Io(e.to_string()))?;
    Ok(dir.join("shell.log"))
}

pub fn append_log(app: &AppHandle, line: &str) {
    let Ok(path) = log_file_path(app) else {
        return;
    };
    write_log_line(&path, line);
}

fn write_log_line(path: &Path, line: &str) {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{ts} {line}");
    }
}

pub fn tail_log(app: &AppHandle) -> Result<String, ShellError> {
    let path = log_file_path(app)?;
    let Ok(raw) = fs::read_to_string(path) else {
        return Ok(String::new());
    };
    let lines: Vec<&str> = raw.lines().collect();
    let start = lines.len().saturating_sub(200);
    Ok(lines[start..].join("\n"))
}

pub fn debug_info(app: &AppHandle) -> Result<serde_json::Value, ShellError> {
    let path = app.path();
    let display = |result: Result<PathBuf, String>| {
        result
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|_| String::new())
    };
    Ok(json!({
        "appVersion": env!("CARGO_PKG_VERSION"),
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "family": std::env::consts::FAMILY,
        "autostartSupported": cfg!(windows),
        "paths": {
            "configDir": display(path.app_config_dir().map_err(|e| e.to_string())),
            "dataDir": display(path.app_data_dir().map_err(|e| e.to_string())),
            "logDir": display(path.app_log_dir().map_err(|e| e.to_string())),
            "logFile": display(log_file_path(app).map_err(|e| e.to_string())),
            "exePath": std::env::current_exe()
                .map(|p| p.to_string_lossy().into_owned())
                .unwrap_or_default(),
        }
    }))
}
