//! invoke handlers。红线：薄——参数校验、分配 traceId、转发、错误规范化；
//! 业务规则出现在这里即重构信号（docs/ARCHITECTURE.md §6）。

use std::sync::Arc;

use serde_json::{json, Value};
use tauri::State;

use crate::error::{ShellError, TracedError};
use crate::sidecar::EngineClient;

pub struct ShellState {
    pub engine: tokio::sync::Mutex<Option<Arc<EngineClient>>>,
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
pub async fn flow_run(state: State<'_, ShellState>, mode: String) -> Result<Value, TracedError> {
    let trace_id = new_trace_id();
    if mode != "run" && mode != "dryRun" {
        return Err(ShellError::Protocol(format!("非法执行模式: {mode}")).with_trace(trace_id));
    }
    let client = engine(&state)
        .await
        .map_err(|e| e.with_trace(trace_id.clone()))?;
    // M0：示例流程内嵌于壳；M2 起由编辑器保存的 *.flow.json 经 flow_open 读入
    let flow = demo_flow();
    client
        .call(
            "flow.start",
            json!({ "flow": flow, "mode": mode }),
            &trace_id,
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

fn demo_flow() -> Value {
    json!({
        "schemaVersion": 1,
        "id": "demo-flow",
        "name": "壳内示例流程",
        "nodes": [
            { "id": "hello", "type": "core.log", "config": { "message": "来自 Tauri 壳的问候" } },
            { "id": "wait", "type": "core.wait", "config": { "ms": 100 } },
            { "id": "bye", "type": "core.log", "config": { "message": "执行完毕" } }
        ],
        "edges": [
            { "id": "e1", "from": "hello", "to": "wait", "kind": "control" },
            { "id": "e2", "from": "wait", "to": "bye", "kind": "control" }
        ]
    })
}
