//! invoke handlers。红线：薄——参数校验、分配 traceId、转发、错误规范化；
//! 业务规则出现在这里即重构信号（docs/ARCHITECTURE.md §6）。

use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};
use tauri::{AppHandle, State};

use crate::error::{ShellError, TracedError};
use crate::prefs::{self, ShellPrefs};
use crate::sidecar::EngineClient;
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
    client
        .call_with_timeout(
            "flow.start",
            json!({ "flow": flow, "mode": mode }),
            &trace_id,
            Duration::from_secs(120),
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
/// 下载指定 tag 的 preferred Windows 安装包到缓存目录。
pub async fn updater_download(app: AppHandle, tag: String) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(&app, &format!("updater.download {tag}"));
    updater::download_release(&app, &tag)
        .await
        .map_err(|e| e.with_trace(trace_id))
}

#[tauri::command]
/// 交互式启动已下载安装器（非静默；签名属 M5）。
pub async fn updater_install(app: AppHandle, path: String) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    prefs::append_log(&app, &format!("updater.install {path}"));
    updater::install_package(&path).map_err(|e| e.with_trace(trace_id))
}
