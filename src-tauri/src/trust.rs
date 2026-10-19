//! 流程信任记录：flowId + contentHash 落本机（SECURITY.md §4）。不含流程正文。

use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

use crate::error::ShellError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TrustRecord {
    flow_id: String,
    content_hash: String,
    trusted_at: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct TrustIndex {
    records: Vec<TrustRecord>,
}

fn index_path(app: &AppHandle) -> Result<PathBuf, ShellError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ShellError::Io(e.to_string()))?;
    fs::create_dir_all(&dir).map_err(|e| ShellError::Io(e.to_string()))?;
    Ok(dir.join("trust-index.json"))
}

fn load_index(app: &AppHandle) -> Result<TrustIndex, ShellError> {
    let path = index_path(app)?;
    if !path.is_file() {
        return Ok(TrustIndex::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| ShellError::Io(e.to_string()))?;
    serde_json::from_str(&raw).map_err(|e| ShellError::Io(e.to_string()))
}

fn save_index(app: &AppHandle, index: &TrustIndex) -> Result<(), ShellError> {
    let path = index_path(app)?;
    let body = serde_json::to_string_pretty(index).map_err(|e| ShellError::Io(e.to_string()))?;
    fs::write(path, body).map_err(|e| ShellError::Io(e.to_string()))
}

fn now_secs() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs_f64())
        .unwrap_or(0.0)
}

fn require_ids(flow_id: &str, content_hash: &str) -> Result<(), ShellError> {
    if flow_id.trim().is_empty() || content_hash.trim().is_empty() {
        return Err(ShellError::InvalidTrust(
            "flowId 与 contentHash 均不能为空".into(),
        ));
    }
    if content_hash.len() != 64 || !content_hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ShellError::InvalidTrust(
            "contentHash 须为 64 位十六进制 SHA-256".into(),
        ));
    }
    Ok(())
}

pub fn list(app: &AppHandle) -> Result<Value, ShellError> {
    let index = load_index(app)?;
    Ok(json!({ "records": index.records }))
}

pub fn check(app: &AppHandle, flow_id: String, content_hash: String) -> Result<Value, ShellError> {
    require_ids(&flow_id, &content_hash)?;
    let index = load_index(app)?;
    let hit = index
        .records
        .iter()
        .find(|r| r.flow_id == flow_id && r.content_hash == content_hash);
    Ok(json!({
        "flowId": flow_id,
        "contentHash": content_hash,
        "trusted": hit.is_some(),
        "trustedAt": hit.map(|r| r.trusted_at),
    }))
}

pub fn mark(app: &AppHandle, flow_id: String, content_hash: String) -> Result<Value, ShellError> {
    require_ids(&flow_id, &content_hash)?;
    let mut index = load_index(app)?;
    index
        .records
        .retain(|r| !(r.flow_id == flow_id && r.content_hash == content_hash));
    let trusted_at = now_secs();
    index.records.push(TrustRecord {
        flow_id: flow_id.clone(),
        content_hash: content_hash.clone(),
        trusted_at,
    });
    save_index(app, &index)?;
    Ok(json!({
        "flowId": flow_id,
        "contentHash": content_hash,
        "trustedAt": trusted_at,
    }))
}

pub fn revoke(
    app: &AppHandle,
    flow_id: String,
    content_hash: Option<String>,
) -> Result<Value, ShellError> {
    if flow_id.trim().is_empty() {
        return Err(ShellError::InvalidTrust("flowId 不能为空".into()));
    }
    let mut index = load_index(app)?;
    let before = index.records.len();
    match content_hash {
        Some(hash) if !hash.is_empty() => {
            index
                .records
                .retain(|r| !(r.flow_id == flow_id && r.content_hash == hash));
        }
        _ => {
            index.records.retain(|r| r.flow_id != flow_id);
        }
    }
    let removed = before.saturating_sub(index.records.len());
    save_index(app, &index)?;
    Ok(json!({ "flowId": flow_id, "removed": removed }))
}
