//! 凭据：值只进系统 keyring；名称索引落本机（不含明文）。见 SECURITY.md §3。

use std::fs;
use std::path::PathBuf;

use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

use crate::error::ShellError;

const SERVICE: &str = "lanius-desktop";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct SecretIndex {
    keys: Vec<String>,
}

fn name_ok(key: &str) -> bool {
    if key.is_empty() || key.len() > 128 {
        return false;
    }
    let mut chars = key.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if !first.is_ascii_alphanumeric() {
        return false;
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-')
}

fn validate_key(key: &str) -> Result<(), ShellError> {
    if name_ok(key) {
        Ok(())
    } else {
        Err(ShellError::InvalidSecret(format!(
            "凭据名不合法（需字母数字开头，最长 128）: {key}"
        )))
    }
}

fn index_path(app: &AppHandle) -> Result<PathBuf, ShellError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ShellError::Io(e.to_string()))?;
    fs::create_dir_all(&dir).map_err(|e| ShellError::Io(e.to_string()))?;
    Ok(dir.join("secrets-index.json"))
}

fn load_index(app: &AppHandle) -> Result<SecretIndex, ShellError> {
    let path = index_path(app)?;
    if !path.exists() {
        return Ok(SecretIndex::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| ShellError::Io(e.to_string()))?;
    serde_json::from_str(&raw).map_err(|e| ShellError::Io(e.to_string()))
}

fn save_index(app: &AppHandle, index: &SecretIndex) -> Result<(), ShellError> {
    let path = index_path(app)?;
    let body = serde_json::to_string_pretty(index).map_err(|e| ShellError::Io(e.to_string()))?;
    fs::write(path, body).map_err(|e| ShellError::Io(e.to_string()))
}

fn entry(key: &str) -> Result<Entry, ShellError> {
    Entry::new(SERVICE, key).map_err(|e| ShellError::SecretBackend(e.to_string()))
}

pub fn list(app: &AppHandle) -> Result<Value, ShellError> {
    let index = load_index(app)?;
    Ok(json!({ "keys": index.keys }))
}

pub fn set(app: &AppHandle, key: String, value: String) -> Result<Value, ShellError> {
    validate_key(&key)?;
    if value.is_empty() {
        return Err(ShellError::InvalidSecret("凭据值不能为空".into()));
    }
    entry(&key)?
        .set_password(&value)
        .map_err(|e| ShellError::SecretBackend(e.to_string()))?;
    let mut index = load_index(app)?;
    if !index.keys.iter().any(|k| k == &key) {
        index.keys.push(key.clone());
        index.keys.sort();
        save_index(app, &index)?;
    }
    Ok(json!({ "key": key }))
}

pub fn get(key: String) -> Result<Value, ShellError> {
    validate_key(&key)?;
    match entry(&key)?.get_password() {
        Ok(value) => Ok(json!({ "key": key, "found": true, "value": value })),
        Err(keyring::Error::NoEntry) => Ok(json!({ "key": key, "found": false, "value": null })),
        Err(e) => Err(ShellError::SecretBackend(e.to_string())),
    }
}

pub fn delete(app: &AppHandle, key: String) -> Result<Value, ShellError> {
    validate_key(&key)?;
    let mut removed = false;
    match entry(&key)?.delete_password() {
        Ok(()) => removed = true,
        Err(keyring::Error::NoEntry) => {}
        Err(e) => return Err(ShellError::SecretBackend(e.to_string())),
    }
    let mut index = load_index(app)?;
    let before = index.keys.len();
    index.keys.retain(|k| k != &key);
    if index.keys.len() != before {
        removed = true;
        save_index(app, &index)?;
    }
    Ok(json!({ "key": key, "removed": removed }))
}
