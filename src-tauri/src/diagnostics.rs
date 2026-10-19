//! 本机诊断包导出：日志 / 调试信息 / 脱敏元数据，无遥测、无凭据明文。

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

use crate::error::ShellError;
use crate::prefs;
use crate::secrets;
use crate::trust;

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn diagnostics_root(app: &AppHandle) -> Result<PathBuf, ShellError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ShellError::Io(e.to_string()))?
        .join("diagnostics");
    fs::create_dir_all(&dir).map_err(|e| ShellError::Io(e.to_string()))?;
    Ok(dir)
}

fn copy_if_present(src: &Path, dest: &Path, files: &mut Vec<String>) -> Result<(), ShellError> {
    if !src.is_file() {
        return Ok(());
    }
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| ShellError::Io(e.to_string()))?;
    }
    fs::copy(src, dest).map_err(|e| ShellError::Io(e.to_string()))?;
    if let Some(name) = dest.file_name() {
        files.push(name.to_string_lossy().into_owned());
    }
    Ok(())
}

fn write_text(path: &Path, body: &str, files: &mut Vec<String>) -> Result<(), ShellError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| ShellError::Io(e.to_string()))?;
    }
    fs::write(path, body).map_err(|e| ShellError::Io(e.to_string()))?;
    if let Some(name) = path.file_name() {
        files.push(name.to_string_lossy().into_owned());
    }
    Ok(())
}

fn dir_bytes(dir: &Path) -> u64 {
    let Ok(entries) = fs::read_dir(dir) else {
        return 0;
    };
    let mut total = 0u64;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Ok(meta) = path.metadata() {
                total = total.saturating_add(meta.len());
            }
        }
    }
    total
}

/// 尝试用系统工具打包；失败不报错，仅返回 None（目录仍可用）。
fn try_archive(bundle_dir: &Path) -> Option<PathBuf> {
    let parent = bundle_dir.parent()?;
    let stem = bundle_dir.file_name()?.to_string_lossy().into_owned();

    if cfg!(windows) {
        let zip_path = parent.join(format!("{stem}.zip"));
        let _ = fs::remove_file(&zip_path);
        let status = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &format!(
                    "Compress-Archive -Path '{}' -DestinationPath '{}' -Force",
                    bundle_dir.display(),
                    zip_path.display()
                ),
            ])
            .status();
        if matches!(status, Ok(s) if s.success()) && zip_path.is_file() {
            return Some(zip_path);
        }
        return None;
    }

    let tar_path = parent.join(format!("{stem}.tar.gz"));
    let _ = fs::remove_file(&tar_path);
    let status = Command::new("tar")
        .args(["-czf", tar_path.to_str()?, "-C", parent.to_str()?, &stem])
        .status();
    if matches!(status, Ok(s) if s.success()) && tar_path.is_file() {
        return Some(tar_path);
    }
    None
}

pub fn export(app: &AppHandle) -> Result<Value, ShellError> {
    let created_at = now_secs();
    let root = diagnostics_root(app)?;
    let bundle_dir = root.join(format!("lanius-diagnostics-{created_at}"));
    fs::create_dir_all(&bundle_dir).map_err(|e| ShellError::Io(e.to_string()))?;

    let mut files: Vec<String> = Vec::new();

    let debug = prefs::debug_info(app)?;
    write_text(
        &bundle_dir.join("debug_info.json"),
        &serde_json::to_string_pretty(&debug).map_err(|e| ShellError::Io(e.to_string()))?,
        &mut files,
    )?;

    let prefs_value =
        serde_json::to_value(prefs::load(app)).map_err(|e| ShellError::Io(e.to_string()))?;
    write_text(
        &bundle_dir.join("prefs.json"),
        &serde_json::to_string_pretty(&prefs_value).map_err(|e| ShellError::Io(e.to_string()))?,
        &mut files,
    )?;

    // 凭据：仅名称列表，永不写入明文
    let secret_names = secrets::list(app)?;
    write_text(
        &bundle_dir.join("secret_names.json"),
        &serde_json::to_string_pretty(&secret_names).map_err(|e| ShellError::Io(e.to_string()))?,
        &mut files,
    )?;

    let trust_index = trust::list(app)?;
    write_text(
        &bundle_dir.join("trust_index.json"),
        &serde_json::to_string_pretty(&trust_index).map_err(|e| ShellError::Io(e.to_string()))?,
        &mut files,
    )?;

    if let Ok(log_path) = prefs::log_file_path(app) {
        copy_if_present(&log_path, &bundle_dir.join("shell.log"), &mut files)?;
    }

    let readme = concat!(
        "Lanius Desktop diagnostics bundle\n",
        "=================================\n",
        "\n",
        "This folder is for local support / crash investigation.\n",
        "Nothing here is uploaded automatically (no telemetry).\n",
        "\n",
        "Contents:\n",
        "- debug_info.json   — app version, OS, paths\n",
        "- prefs.json        — shell preferences (no secrets)\n",
        "- secret_names.json — credential names only\n",
        "- trust_index.json  — trusted flowId + contentHash\n",
        "- shell.log         — shell log if present\n",
        "\n",
        "Do not share this bundle if it may contain paths or flow IDs you consider sensitive.\n",
    );
    write_text(&bundle_dir.join("README.txt"), readme, &mut files)?;

    files.sort();
    files.dedup();

    let bytes = dir_bytes(&bundle_dir);
    let archive = try_archive(&bundle_dir);
    let archived = archive.is_some();
    let archive_path = archive.as_ref().map(|p| p.to_string_lossy().into_owned());

    prefs::append_log(
        app,
        &format!(
            "diagnostics.export {} ({} files, archived={archived})",
            bundle_dir.display(),
            files.len()
        ),
    );

    Ok(json!({
        "path": bundle_dir.to_string_lossy(),
        "bytes": bytes,
        "filesIncluded": files,
        "createdAt": created_at as f64,
        "archived": archived,
        "archivePath": archive_path,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn try_archive_creates_tarball_on_unix() {
        if cfg!(windows) {
            return;
        }
        let tmp = std::env::temp_dir().join(format!("lanius-diag-test-{}", now_secs()));
        let bundle = tmp.join("lanius-diagnostics-test");
        fs::create_dir_all(&bundle).expect("mkdir");
        fs::write(bundle.join("README.txt"), "hi").expect("write");
        let archive = try_archive(&bundle);
        assert!(archive.is_some(), "expected tar.gz via system tar");
        let path = archive.expect("archive");
        assert!(path.is_file());
        let _ = fs::remove_dir_all(&tmp);
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn dir_bytes_sums_files() {
        let tmp = std::env::temp_dir().join(format!("lanius-diag-bytes-{}", now_secs()));
        fs::create_dir_all(&tmp).expect("mkdir");
        fs::write(tmp.join("a.txt"), "abcd").expect("a");
        fs::write(tmp.join("b.txt"), "ef").expect("b");
        assert_eq!(dir_bytes(&tmp), 6);
        let _ = fs::remove_dir_all(&tmp);
    }
}
