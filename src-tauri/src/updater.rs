//! GitHub Releases → Windows 安装包下载 / 交互式启动。
//! 对齐姊妹仓 Minecraft-Utilities 的「tag → package」模式；HTTP 经 curl（ADR-0011）。
//! 签名静默安装属 M5。本模块只做：拉公开 Releases、过滤 Windows 资产、落盘、启动安装器。

use std::fs;
use std::path::PathBuf;
use std::process::Command;
#[cfg(windows)]
use std::path::Path;

use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};

use crate::error::ShellError;

const DEFAULT_OWNER: &str = "LaniusLab";
const DEFAULT_REPO: &str = "LaniusDesktop";
pub const PROGRESS_EVENT: &str = "updater://progress";

fn owner_repo() -> (String, String) {
    if let Ok(raw) = std::env::var("LANIUS_GITHUB_REPO") {
        let trimmed = raw.trim();
        if let Some((o, r)) = trimmed.split_once('/') {
            if !o.is_empty() && !r.is_empty() {
                return (o.to_string(), r.to_string());
            }
        }
    }
    (DEFAULT_OWNER.into(), DEFAULT_REPO.into())
}

fn releases_page_url() -> String {
    let (o, r) = owner_repo();
    format!("https://github.com/{o}/{r}/releases")
}

fn current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn strip_v(tag: &str) -> &str {
    tag.strip_prefix('v')
        .or_else(|| tag.strip_prefix('V'))
        .unwrap_or(tag)
}

fn curl_bin() -> &'static str {
    // Windows 10+ 自带 curl.exe；Unix 用 PATH 中的 curl。
    if cfg!(windows) {
        "curl.exe"
    } else {
        "curl"
    }
}

fn http_get_text(url: &str) -> Result<String, ShellError> {
    let output = Command::new(curl_bin())
        .args([
            "-fsSL",
            "--connect-timeout",
            "25",
            "--max-time",
            "90",
            "-H",
            "Accept: application/vnd.github+json",
            "-H",
            "X-GitHub-Api-Version: 2022-11-28",
            "-A",
            &format!(
                "{}/{} (lanius-desktop-updater)",
                env!("CARGO_PKG_NAME"),
                env!("CARGO_PKG_VERSION")
            ),
            url,
        ])
        .output()
        .map_err(|e| {
            ShellError::UpdaterNetwork(format!(
                "无法启动 curl（请确认本机已安装）: {e}"
            ))
        })?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(ShellError::UpdaterNetwork(format!(
            "curl failed ({url}): {stderr}"
        )));
    }
    String::from_utf8(output.stdout)
        .map_err(|e| ShellError::UpdaterNetwork(format!("响应非 UTF-8: {e}")))
}

fn http_download_file(url: &str, dest: &std::path::Path) -> Result<(), ShellError> {
    let status = Command::new(curl_bin())
        .args([
            "-fL",
            "--connect-timeout",
            "25",
            "--max-time",
            "600",
            "-A",
            &format!(
                "{}/{} (lanius-desktop-updater)",
                env!("CARGO_PKG_NAME"),
                env!("CARGO_PKG_VERSION")
            ),
            "-o",
            &dest.to_string_lossy(),
            url,
        ])
        .status()
        .map_err(|e| {
            ShellError::UpdaterNetwork(format!(
                "无法启动 curl（请确认本机已安装）: {e}"
            ))
        })?;
    if !status.success() {
        let _ = fs::remove_file(dest);
        return Err(ShellError::UpdaterNetwork(format!(
            "curl download failed ({url})"
        )));
    }
    Ok(())
}

fn emit_progress(app: &AppHandle, phase: &str, tag: Option<&str>, downloaded: u64, total: Option<u64>) {
    let percent = total
        .filter(|t| *t > 0)
        .map(|t| ((downloaded as f64 / t as f64) * 1000.0).round() / 10.0);
    let _ = app.emit(
        PROGRESS_EVENT,
        json!({
            "phase": phase,
            "tag": tag,
            "downloaded": downloaded,
            "total": total,
            "percent": percent,
        }),
    );
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseAsset {
    name: String,
    url: String,
    size: u64,
    kind: &'static str,
}

fn classify_windows_asset(name: &str) -> Option<&'static str> {
    let lower = name.to_ascii_lowercase();
    if !(lower.ends_with(".msi") || lower.ends_with(".exe")) {
        return None;
    }
    if lower.ends_with(".exe") && !(lower.contains("setup") || lower.contains("lanius")) {
        return None;
    }
    if lower.ends_with(".msi") {
        return Some("msi");
    }
    if lower.contains("setup") {
        return Some("setupExe");
    }
    Some("other")
}

fn prefer_asset(assets: &[ReleaseAsset]) -> Option<ReleaseAsset> {
    assets
        .iter()
        .find(|a| a.kind == "setupExe")
        .or_else(|| assets.iter().find(|a| a.kind == "msi"))
        .or_else(|| assets.first())
        .cloned()
}

fn parse_release(raw: &Value) -> Option<Value> {
    if raw.get("draft").and_then(|v| v.as_bool()).unwrap_or(false) {
        return None;
    }
    let tag = raw.get("tag_name")?.as_str()?.to_string();
    let html_url = raw
        .get("html_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let name = raw
        .get("name")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or(tag.as_str())
        .to_string();
    let body = raw.get("body").and_then(|v| v.as_str()).map(str::to_string);
    let prerelease = raw
        .get("prerelease")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let published_at = raw
        .get("published_at")
        .and_then(|v| v.as_str())
        .map(str::to_string);

    let mut windows_assets: Vec<ReleaseAsset> = Vec::new();
    if let Some(assets) = raw.get("assets").and_then(|a| a.as_array()) {
        for a in assets {
            let asset_name = a.get("name").and_then(|n| n.as_str()).unwrap_or("");
            let Some(kind) = classify_windows_asset(asset_name) else {
                continue;
            };
            let url = a
                .get("browser_download_url")
                .and_then(|u| u.as_str())
                .unwrap_or("");
            if url.is_empty() {
                continue;
            }
            let size = a.get("size").and_then(|s| s.as_u64()).unwrap_or(0);
            windows_assets.push(ReleaseAsset {
                name: asset_name.to_string(),
                url: url.to_string(),
                size,
                kind,
            });
        }
    }

    let preferred = prefer_asset(&windows_assets);
    Some(json!({
        "tag": tag,
        "name": name,
        "body": body,
        "prerelease": prerelease,
        "publishedAt": published_at,
        "htmlUrl": html_url,
        "windowsAssets": windows_assets,
        "preferredAsset": preferred,
    }))
}

fn fetch_release_values() -> Result<Vec<Value>, ShellError> {
    let (owner, repo) = owner_repo();
    let api = format!("https://api.github.com/repos/{owner}/{repo}/releases?per_page=40");
    let text = http_get_text(&api)?;
    let body: Value = serde_json::from_str(&text)
        .map_err(|e| ShellError::UpdaterNetwork(format!("JSON 解析失败: {e}")))?;
    body.as_array()
        .cloned()
        .ok_or_else(|| ShellError::UpdaterNetwork("releases 响应不是数组".into()))
}

fn version_gt(a: &str, b: &str) -> bool {
    fn parts(s: &str) -> [u64; 3] {
        let mut out = [0u64; 3];
        for (i, p) in strip_v(s).split('.').take(3).enumerate() {
            out[i] = p
                .chars()
                .take_while(|c| c.is_ascii_digit())
                .collect::<String>()
                .parse()
                .unwrap_or(0);
        }
        out
    }
    parts(a) > parts(b)
}

/// 列出 published releases（公开 API；draft 不可见）。
pub async fn list_releases(app: &AppHandle) -> Result<Value, ShellError> {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        emit_progress(&app, "fetching", None, 0, None);
        let raw = fetch_release_values()?;
        let mut releases: Vec<Value> = raw.iter().filter_map(parse_release).collect();
        releases.sort_by(|a, b| {
            let ta = a
                .get("publishedAt")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let tb = b
                .get("publishedAt")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            tb.cmp(ta)
        });
        emit_progress(&app, "done", None, 0, None);
        Ok(json!({
            "currentVersion": current_version(),
            "releases": releases,
            "releasesPageUrl": releases_page_url(),
            "draftsOmitted": true,
        }))
    })
    .await
    .map_err(|e| ShellError::UpdaterNetwork(format!("task join: {e}")))?
}

/// 相对当前版本检查是否有更新（最大 published tag + Windows 包）。
pub async fn check_update(app: &AppHandle) -> Result<Value, ShellError> {
    let list = list_releases(app).await?;
    let current = current_version();
    let releases = list
        .get("releases")
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();

    let mut best: Option<&Value> = None;
    for rel in &releases {
        if rel.get("prerelease").and_then(|v| v.as_bool()).unwrap_or(false) {
            continue;
        }
        let tag = rel.get("tag").and_then(|v| v.as_str()).unwrap_or("");
        if !version_gt(tag, &current) {
            continue;
        }
        let has_asset = rel
            .get("preferredAsset")
            .map(|a| !a.is_null())
            .unwrap_or(false);
        if !has_asset {
            continue;
        }
        match best {
            None => best = Some(rel),
            Some(b) => {
                let bt = b.get("tag").and_then(|v| v.as_str()).unwrap_or("");
                if version_gt(tag, bt) {
                    best = Some(rel);
                }
            }
        }
    }

    match best {
        Some(rel) => Ok(json!({
            "status": "available",
            "currentVersion": current,
            "latestTag": rel.get("tag"),
            "latestVersion": strip_v(rel.get("tag").and_then(|v| v.as_str()).unwrap_or("")),
            "message": "updater.available",
            "preferredAsset": rel.get("preferredAsset"),
        })),
        None => {
            if releases.is_empty() {
                Ok(json!({
                    "status": "unavailable",
                    "currentVersion": current,
                    "latestTag": Value::Null,
                    "latestVersion": Value::Null,
                    "message": "updater.noPublishedReleases",
                    "preferredAsset": Value::Null,
                }))
            } else {
                Ok(json!({
                    "status": "upToDate",
                    "currentVersion": current,
                    "latestTag": Value::Null,
                    "latestVersion": Value::Null,
                    "message": "updater.upToDate",
                    "preferredAsset": Value::Null,
                }))
            }
        }
    }
}

fn updates_dir(app: &AppHandle) -> Result<PathBuf, ShellError> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| ShellError::Io(e.to_string()))?
        .join("updates");
    fs::create_dir_all(&dir).map_err(|e| ShellError::Io(e.to_string()))?;
    Ok(dir)
}

fn find_release_by_tag<'a>(releases: &'a [Value], tag: &str) -> Result<&'a Value, ShellError> {
    let want = tag.trim();
    releases
        .iter()
        .find(|r| {
            r.get("tag")
                .and_then(|v| v.as_str())
                .is_some_and(|t| {
                    t.eq_ignore_ascii_case(want)
                        || strip_v(t).eq_ignore_ascii_case(strip_v(want))
                })
        })
        .ok_or_else(|| ShellError::UpdaterNotFound(want.to_string()))
}

/// 下载指定 tag 的 preferred Windows 资产到缓存目录。
pub async fn download_release(app: &AppHandle, tag: &str) -> Result<Value, ShellError> {
    let tag = tag.trim().to_string();
    if tag.is_empty() {
        return Err(ShellError::UpdaterNotFound("(empty tag)".into()));
    }
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        emit_progress(&app, "fetching", Some(&tag), 0, None);
        let raw = fetch_release_values()?;
        let releases: Vec<Value> = raw.iter().filter_map(parse_release).collect();
        let rel = find_release_by_tag(&releases, &tag)?;
        let asset = rel
            .get("preferredAsset")
            .filter(|a| !a.is_null())
            .ok_or_else(|| ShellError::UpdaterNoAsset(tag.clone()))?;
        let url = asset
            .get("url")
            .and_then(|u| u.as_str())
            .ok_or_else(|| ShellError::UpdaterNoAsset(tag.clone()))?;
        let file_name = asset
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or("lanius-update.bin");
        let kind = asset
            .get("kind")
            .and_then(|k| k.as_str())
            .unwrap_or("other");
        let size = asset.get("size").and_then(|s| s.as_u64());

        let dest = updates_dir(&app)?.join(file_name);
        if dest.exists() {
            let _ = fs::remove_file(&dest);
        }

        emit_progress(&app, "downloading", Some(&tag), 0, size);
        http_download_file(url, &dest)?;
        let n = fs::metadata(&dest)
            .map(|m| m.len())
            .unwrap_or(size.unwrap_or(0));
        emit_progress(&app, "done", Some(&tag), n, Some(n));

        Ok(json!({
            "tag": rel.get("tag").and_then(|v| v.as_str()).unwrap_or(tag.as_str()),
            "fileName": file_name,
            "path": dest.to_string_lossy(),
            "bytes": n,
            "kind": kind,
        }))
    })
    .await
    .map_err(|e| ShellError::UpdaterNetwork(format!("task join: {e}")))?
}

/// 交互式启动已下载的安装器（非静默；签名通道属 M5）。
pub fn install_package(path: &str) -> Result<Value, ShellError> {
    #[cfg(not(windows))]
    {
        let _ = path;
        Err(ShellError::UpdaterUnsupported)
    }
    #[cfg(windows)]
    {
        let p = Path::new(path);
        if !p.is_file() {
            return Err(ShellError::UpdaterInvalidPath(path.to_string()));
        }
        let ext = p
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        let status = if ext == "msi" {
            Command::new("msiexec").args(["/i", path]).spawn()
        } else if ext == "exe" {
            Command::new(path).spawn()
        } else {
            return Err(ShellError::UpdaterInvalidPath(format!(
                "unsupported installer extension: {ext}"
            )));
        };
        status.map_err(|e| ShellError::Io(e.to_string()))?;
        Ok(json!({
            "path": path,
            "launched": true,
            "mode": "interactiveInstaller",
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_lanius_windows_assets() {
        assert_eq!(
            classify_windows_asset("Lanius.Desktop_0.2.0_x64-setup.exe"),
            Some("setupExe")
        );
        assert_eq!(
            classify_windows_asset("Lanius.Desktop_0.2.0_x64_en-US.msi"),
            Some("msi")
        );
        assert_eq!(classify_windows_asset("Lanius.Desktop_0.2.0_amd64.deb"), None);
        assert_eq!(classify_windows_asset("notes.txt"), None);
    }

    #[test]
    fn prefers_setup_over_msi() {
        let assets = vec![
            ReleaseAsset {
                name: "a.msi".into(),
                url: "u1".into(),
                size: 1,
                kind: "msi",
            },
            ReleaseAsset {
                name: "a-setup.exe".into(),
                url: "u2".into(),
                size: 2,
                kind: "setupExe",
            },
        ];
        let p = prefer_asset(&assets).expect("preferred");
        assert_eq!(p.kind, "setupExe");
    }

    #[test]
    fn skips_drafts_in_parse() {
        let draft = json!({
            "tag_name": "v0.2.0",
            "draft": true,
            "html_url": "https://example",
            "assets": []
        });
        assert!(parse_release(&draft).is_none());
    }

    #[test]
    fn version_compare() {
        assert!(version_gt("v0.3.0", "0.2.0"));
        assert!(!version_gt("0.2.0", "0.2.0"));
        assert!(!version_gt("0.1.9", "0.2.0"));
    }
}
