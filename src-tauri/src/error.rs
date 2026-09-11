//! 壳层错误 → 统一错误模型（docs/PROTOCOL.md §4）。
//! 所有 invoke handler 返回 Result<T, ShellError>，serde 序列化后经桥接层呈现。

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ShellError {
    #[error("引擎 sidecar 启动失败: {0}")]
    SidecarSpawn(String),

    #[error("引擎 sidecar 不可用（可能已退出）")]
    SidecarUnavailable,

    #[error("引擎响应超时")]
    RpcTimeout,

    #[error("引擎返回错误: {0}")]
    EngineError(serde_json::Value),

    #[error("协议帧解析失败: {0}")]
    Protocol(String),

    #[error("方法不在允许清单内: {0}")]
    MethodNotAllowed(String),
}

#[derive(Serialize)]
struct ErrorPayload {
    code: String,
    message: String,
    severity: &'static str,
    source: &'static str,
    #[serde(rename = "traceId")]
    trace_id: String,
    retryable: bool,
}

impl ShellError {
    pub fn code(&self) -> &'static str {
        match self {
            ShellError::SidecarSpawn(_) => "shell.sidecar.spawnFailed",
            ShellError::SidecarUnavailable => "shell.sidecar.unavailable",
            ShellError::RpcTimeout => "shell.transport.timeout",
            ShellError::EngineError(_) => "shell.engine.returnedError",
            ShellError::Protocol(_) => "shell.transport.protocolError",
            ShellError::MethodNotAllowed(_) => "shell.rpc.methodNotAllowed",
        }
    }

    pub fn with_trace(self, trace_id: String) -> TracedError {
        TracedError {
            error: self,
            trace_id,
        }
    }
}

/// 携带 traceId 的错误包装；Tauri 要求 command 错误实现 Serialize
#[derive(Debug)]
pub struct TracedError {
    error: ShellError,
    trace_id: String,
}

impl Serialize for TracedError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let (severity, retryable) = match &self.error {
            ShellError::SidecarSpawn(_) => ("fatal", true),
            ShellError::SidecarUnavailable => ("error", true),
            ShellError::RpcTimeout => ("error", true),
            ShellError::EngineError(_) => ("error", false),
            ShellError::Protocol(_) => ("error", false),
            ShellError::MethodNotAllowed(_) => ("warning", false),
        };
        ErrorPayload {
            code: self.error.code().to_string(),
            message: self.error.to_string(),
            severity,
            source: "shell",
            trace_id: self.trace_id.clone(),
            retryable,
        }
        .serialize(serializer)
    }
}

impl std::fmt::Display for TracedError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.error)
    }
}

impl std::error::Error for TracedError {}
