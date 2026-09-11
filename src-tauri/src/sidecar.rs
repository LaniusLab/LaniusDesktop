//! Python 引擎 sidecar 守护 + JSON-RPC client（docs/ARCHITECTURE.md §5.1）。
//!
//! 帧格式 NDJSON；通知帧（无 id）转发为 Tauri event `engine://event`；
//! 请求/响应经 pending 表按 id 关联，默认 10s 超时。

use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::{oneshot, Mutex};
use tokio::time::{timeout, Duration};

use crate::error::ShellError;

const RPC_TIMEOUT: Duration = Duration::from_secs(10);

/// 请求 id → 响应通道的挂起表
type PendingMap = Arc<Mutex<HashMap<u64, oneshot::Sender<Result<Value, ShellError>>>>>;

/// 允许 UI 经壳透传的引擎方法（最小暴露面，PROTOCOL.md §8）
const ALLOWED_METHODS: &[&str] = &[
    "engine.ping",
    "flow.validate",
    "flow.start",
    "flow.pause",
    "flow.resume",
    "flow.cancel",
    "execution.get",
    "execution.list",
];

pub struct EngineClient {
    stdin: Mutex<ChildStdin>,
    pending: PendingMap,
    next_id: AtomicU64,
    child: Mutex<Child>,
}

impl EngineClient {
    /// spawn 引擎进程并启动 stdout 读取循环。
    /// 开发模式（debug_assertions）启动 `python -m lanius_engine`；
    /// 生产模式启动 externalBin 打包的 PyInstaller 产物。
    pub async fn spawn(app: AppHandle) -> Result<Arc<Self>, ShellError> {
        let mut command = resolve_engine_command();
        command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            // stderr 直通壳的 stderr：引擎日志（structlog）由此进壳的日志通道
            .stderr(Stdio::inherit());

        let mut child = command
            .spawn()
            .map_err(|e| ShellError::SidecarSpawn(e.to_string()))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| ShellError::SidecarSpawn("无法打开引擎 stdin".into()))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| ShellError::SidecarSpawn("无法打开引擎 stdout".into()))?;

        let pending: PendingMap = Arc::new(Mutex::new(HashMap::new()));
        let pending_reader = Arc::clone(&pending);

        tauri::async_runtime::spawn(async move {
            let mut lines = BufReader::new(stdout).lines();
            loop {
                match lines.next_line().await {
                    Ok(Some(line)) => {
                        let Ok(frame) = serde_json::from_str::<Value>(&line) else {
                            tracing::warn!(target: "sidecar", "丢弃无法解析的帧: {line}");
                            continue;
                        };
                        if let Some(id) = frame.get("id").and_then(Value::as_u64) {
                            let sender = pending_reader.lock().await.remove(&id);
                            if let Some(sender) = sender {
                                let result = if let Some(error) = frame.get("error") {
                                    Err(ShellError::EngineError(error.clone()))
                                } else {
                                    Ok(frame.get("result").cloned().unwrap_or(Value::Null))
                                };
                                let _ = sender.send(result);
                            }
                        } else {
                            // 通知帧：原样转发给 UI（execution.* / engine.heartbeat 等）
                            let _ = app.emit("engine://event", &frame);
                        }
                    }
                    Ok(None) => {
                        tracing::error!(target: "sidecar", "引擎 stdout 关闭（进程退出）");
                        let _ = app.emit(
                            "engine://event",
                            json!({ "kind": "status", "status": "stopped" }),
                        );
                        break;
                    }
                    Err(err) => {
                        tracing::error!(target: "sidecar", "读取引擎输出失败: {err}");
                        break;
                    }
                }
            }
        });

        Ok(Arc::new(Self {
            stdin: Mutex::new(stdin),
            pending,
            next_id: AtomicU64::new(1),
            child: Mutex::new(child),
        }))
    }

    pub fn is_method_allowed(method: &str) -> bool {
        ALLOWED_METHODS.contains(&method)
    }

    pub async fn call(
        &self,
        method: &str,
        params: Value,
        trace_id: &str,
    ) -> Result<Value, ShellError> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = oneshot::channel();
        self.pending.lock().await.insert(id, tx);

        let frame = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
            "meta": { "traceId": trace_id },
        });
        let payload = format!("{frame}\n");
        {
            let mut stdin = self.stdin.lock().await;
            stdin
                .write_all(payload.as_bytes())
                .await
                .map_err(|_| ShellError::SidecarUnavailable)?;
            stdin
                .flush()
                .await
                .map_err(|_| ShellError::SidecarUnavailable)?;
        }

        match timeout(RPC_TIMEOUT, rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_closed)) => Err(ShellError::SidecarUnavailable),
            Err(_elapsed) => {
                self.pending.lock().await.remove(&id);
                Err(ShellError::RpcTimeout)
            }
        }
    }

    /// 应用退出时调用：先尝试优雅 shutdown，超时后强杀。
    pub async fn shutdown(&self) {
        let _ = self.call("engine.shutdown", json!({}), "shutdown").await;
        let mut child = self.child.lock().await;
        if timeout(Duration::from_secs(3), child.wait()).await.is_err() {
            let _ = child.kill().await;
        }
    }
}

fn resolve_engine_command() -> Command {
    if let Ok(custom) = std::env::var("LANIUS_ENGINE_CMD") {
        // 开发逃生门：LANIUS_ENGINE_CMD="python -m lanius_engine"
        let mut parts = custom.split_whitespace();
        let program = parts.next().unwrap_or("python");
        let mut cmd = Command::new(program);
        cmd.args(parts);
        return cmd;
    }

    if cfg!(debug_assertions) {
        let mut cmd = Command::new("python3");
        cmd.arg("-m").arg("lanius_engine");
        // 开发模式直接以仓库 engine/ 为来源，无需先打包 PyInstaller 产物
        if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
            let engine_dir = std::path::Path::new(&manifest_dir).join("../engine");
            cmd.current_dir(&engine_dir);
            cmd.env("PYTHONPATH", engine_dir.join("src"));
        }
        cmd
    } else {
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.to_path_buf()))
            .unwrap_or_default();
        let binary = exe_dir.join("binaries").join(if cfg!(windows) {
            "lanius-engine.exe"
        } else {
            "lanius-engine"
        });
        Command::new(binary)
    }
}
