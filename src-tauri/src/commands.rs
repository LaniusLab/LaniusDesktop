//! invoke handlers。红线：薄——参数校验、分配 traceId、转发、错误规范化；
//! 业务规则出现在这里即重构信号（docs/ARCHITECTURE.md §6）。

use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};
use tauri::{AppHandle, State};

use crate::diagnostics;
use crate::error::{ShellError, TracedError};
use crate::prefs::{self, ShellPrefs};
use crate::secrets;
use crate::sidecar::EngineClient;
use crate::trust;
use crate::updater;

pub struct ShellState {
    pub engine: tokio::sync::Mutex<Option<Arc<EngineClient>>>,
    pub prefs: std::sync::Mutex<ShellPrefs>,
}

fn new_trace_id() -> String {
    ulid::Ulid::new().to_string()
}

async fn engine(state: &ShellState) -> Result<Arc<EngineClient>, ShellError> {
    state
        .engine
        .lock()
        .await
        .clone()
        .ok_or(ShellError::SidecarUnavailable)
}

#[tauri::command]
pub async fn engine_info(state: State<'_, ShellState>) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    let client = engine(&state)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    client
        .call(
            "engine.hello",
            json!({ "protocolVersion": "0.1.0" }),
            &trace_id,
        )
        .await
        .map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn engine_ping(state: State<'_, ShellState>) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    let client = engine(&state)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    client
        .call("engine.ping", json!({}), &trace_id)
        .await
        .map_err(|e| e.with_trace(trace_id))
}

/// 通用透传：方法必须在允许清单内，避免 UI 触达未评审的引擎能力
#[tauri::command]
pub async fn engine_call(
    state: State<'_, ShellState>,
    method: String,
    params: Option<Value>,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    if !EngineClient::is_method_allowed(&method) {
        return Err(ShellError::MethodNotAllowed(method).with_trace(trace_id));
    }
    let client = engine(&state)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    client
        .call(&method, params.unwrap_or_else(|| json!({})), &trace_id)
        .await
        .map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn flow_run(
    state: State<'_, ShellState>,
    flow: Value,
    mode: String,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    if mode != "run" && mode != "dryRun" {
        return Err(ShellError::Protocol(format!("非法执行模式: {mode}")).with_trace(trace_id));
    }
    // 壳只做形状校验；语义归引擎。schemaVersion 2 以 steps 为真源。
    if !flow.get("steps").is_some_and(Value::is_array) {
        return Err(ShellError::Protocol("flow 缺少 steps 数组".into()).with_trace(trace_id));
    }
    let client = engine(&state)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    // M1：flow.start 立即返回 executionId；进度走通知，壳无需长超时
    client
        .call_with_timeout(
            "flow.start",
            json!({ "flow": flow, "mode": mode }),
            &trace_id,
            Duration::from_secs(15),
        )
        .await
        .map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn flow_cancel(
    state: State<'_, ShellState>,
    execution_id: String,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    let client = engine(&state)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    client
        .call(
            "flow.cancel",
            json!({ "executionId": execution_id }),
            &trace_id,
        )
        .await
        .map_err(|e| e.with_trace(trace_id))
}

/// 打开本机 `*.flow.json`：读盘 → `flow.migrate`。OS 对话框属后续（需 dialog 插件 ADR）。
#[tauri::command]
pub async fn flow_open(state: State<'_, ShellState>, path: String) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    if path.trim().is_empty() {
        return Err(ShellError::Protocol("flow_open 需要 path".into()).with_trace(trace_id));
    }
    let file_path = Path::new(&path);
    let raw = fs::read_to_string(file_path).map_err(|e| {
        ShellError::Io(format!("无法读取 {}: {e}", file_path.display())).with_trace(trace_id.clone())
    })?;
    let flow: Value = serde_json::from_str(&raw).map_err(|e| {
        ShellError::Protocol(format!("流程文件不是合法 JSON: {e}")).with_trace(trace_id.clone())
    })?;
    let client = engine(&state)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    let migrated = client
        .call("flow.migrate", json!({ "flow": flow }), &trace_id)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    Ok(json!({
        "path": path,
        "flow": migrated.get("flow").cloned().unwrap_or(Value::Null),
        "migratedFrom": migrated.get("migratedFrom").cloned().unwrap_or(Value::Null),
        "migratedTo": migrated.get("migratedTo").cloned().unwrap_or(Value::Null),
    }))
}

/// 保存流程：先 `flow.validate`，再写盘。
#[tauri::command]
pub async fn flow_save(
    state: State<'_, ShellState>,
    path: String,
    flow: Value,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    if path.trim().is_empty() {
        return Err(ShellError::Protocol("flow_save 需要 path".into()).with_trace(trace_id));
    }
    if !flow.get("steps").is_some_and(Value::is_array) {
        return Err(ShellError::Protocol("flow 缺少 steps 数组".into()).with_trace(trace_id));
    }
    let client = engine(&state)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    let validated = client
        .call("flow.validate", json!({ "flow": flow }), &trace_id)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    if validated.get("ok") != Some(&Value::Bool(true)) {
        return Err(ShellError::Protocol(format!(
            "流程校验未通过: {}",
            validated
                .get("issues")
                .cloned()
                .unwrap_or(Value::Array(vec![]))
        ))
        .with_trace(trace_id));
    }
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| {
                ShellError::Io(format!("无法创建目录 {}: {e}", parent.display()))
                    .with_trace(trace_id.clone())
            })?;
        }
    }
    let body = serde_json::to_string_pretty(&flow)
        .map_err(|e| ShellError::Io(e.to_string()).with_trace(trace_id.clone()))?;
    fs::write(file_path, body).map_err(|e| {
        ShellError::Io(format!("无法写入 {}: {e}", file_path.display())).with_trace(trace_id.clone())
    })?;
    Ok(json!({ "path": path }))
}

fn lock_prefs(state: &ShellState) -> std::sync::MutexGuard<'_, ShellPrefs> {
    state.prefs.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

#[tauri::command]
pub async fn prefs_get(state: State<'_, ShellState>) -> Result<Value, TracedError> {
    let prefs = lock_prefs(&state).clone();
    serde_json::to_value(prefs)
        .map_err(|e| ShellError::Io(e.to_string()).with_trace(new_trace_id()))
}

#[tauri::command]
pub async fn secret_list(app: AppHandle) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    secrets::list(&app).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn secret_set(app: AppHandle, key: String, value: String) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    // 不把 value 写入日志
    prefs::append_log(&app, &format!("secret.set key={key}"));
    secrets::set(&app, key, value).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn secret_get(key: String) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    secrets::get(key).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn secret_delete(app: AppHandle, key: String) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(&app, &format!("secret.delete key={key}"));
    secrets::delete(&app, key).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn trust_list(app: AppHandle) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    trust::list(&app).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn trust_check(
    app: AppHandle,
    flow_id: String,
    content_hash: String,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    trust::check(&app, flow_id, content_hash).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn trust_mark(
    app: AppHandle,
    flow_id: String,
    content_hash: String,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(&app, &format!("trust.mark flowId={flow_id}"));
    trust::mark(&app, flow_id, content_hash).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn trust_revoke(
    app: AppHandle,
    flow_id: String,
    content_hash: Option<String>,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(&app, &format!("trust.revoke flowId={flow_id}"));
    trust::revoke(&app, flow_id, content_hash).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]

/// Persist prefs then best-effort apply Windows autostart; autostart failures are logged, not fatal.
pub async fn prefs_set(
    app: AppHandle,
    state: State<'_, ShellState>,
    prefs: Value,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    let parsed = prefs::parse_prefs(prefs).map_err(|e| e.with_trace(trace_id.clone()))?;
    prefs::save(&app, &parsed).map_err(|e| e.with_trace(trace_id.clone()))?;
    if let Err(err) = prefs::apply_autostart(&app, parsed.autostart) {
        tracing::warn!(target: "shell", "开机自启未写入: {err}");
        prefs::append_log(&app, &format!("autostart apply failed: {err}"));
    }
    *lock_prefs(&state) = parsed.clone();
    prefs::append_log(&app, "prefs saved");
    serde_json::to_value(parsed).map_err(|e| ShellError::Io(e.to_string()).with_trace(trace_id))
}

#[tauri::command]
pub async fn shell_debug_info(app: AppHandle) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::debug_info(&app).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
pub async fn logs_tail(app: AppHandle) -> Result<String, TracedError> {
    let trace_id = new_trace_id();
    prefs::tail_log(&app).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
/// 导出本机诊断包（日志 / 调试信息 / 名称级元数据；无遥测、无凭据明文）。
pub async fn shell_export_diagnostics(app: AppHandle) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    diagnostics::export(&app).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
/// 列出 GitHub published releases（tag 真源）；draft 对公开 API 不可见。
pub async fn updater_list(app: AppHandle) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(&app, "updater.list");
    updater::list_releases(&app)
        .await
        .map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
/// 相对当前版本检查是否有带 Windows 包的更新。
pub async fn updater_check(app: AppHandle) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(&app, "updater.check");
    updater::check_update(&app)
        .await
        .map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
/// 下载指定 tag 的 Windows 安装包（可选 assetName；默认 preferred）。
pub async fn updater_download(
    app: AppHandle,
    tag: String,
    asset_name: Option<String>,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(
        &app,
        &format!(
            "updater.download {tag}{}",
            asset_name
                .as_deref()
                .map(|n| format!(" ({n})"))
                .unwrap_or_default()
        ),
    );
    updater::download_release(&app, &tag, asset_name)
        .await
        .map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
/// 交互式启动已下载安装器（非静默；签名属 M5）。路径须在更新缓存目录内。
pub async fn updater_install(app: AppHandle, path: String) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(&app, &format!("updater.install {path}"));
    updater::install_package(&app, &path).map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
/// 下载并在 Windows 上启动安装器；其他平台只下载。
pub async fn updater_apply(
    app: AppHandle,
    tag: String,
    asset_name: Option<String>,
) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(&app, &format!("updater.apply {tag}"));
    updater::apply_release(&app, &tag, asset_name)
        .await
        .map_err(|e| e.with_trace(trace_id))
}
