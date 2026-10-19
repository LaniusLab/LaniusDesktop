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

    #[error("读写本机文件失败: {0}")]
    Io(String),

    #[error("偏好不合法: {0}")]
    InvalidPrefs(String),

    #[error("更新通道网络失败: {0}")]
    UpdaterNetwork(String),

    #[error("未找到对应 release: {0}")]
    UpdaterNotFound(String),

    #[error("该版本无 Windows 安装包: {0}")]
    UpdaterNoAsset(String),

    #[error("当前平台不支持安装更新")]
    UpdaterUnsupported,

    #[error("更新包路径无效: {0}")]
    #[allow(dead_code)] // 仅 Windows 安装路径使用
    UpdaterInvalidPath(String),
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
            ShellError::Io(_) => "shell.io.failed",
            ShellError::InvalidPrefs(_) => "shell.prefs.invalid",
            ShellError::UpdaterNetwork(_) => "shell.updater.networkFailed",
            ShellError::UpdaterNotFound(_) => "shell.updater.releaseNotFound",
            ShellError::UpdaterNoAsset(_) => "shell.updater.noWindowsAsset",
            ShellError::UpdaterUnsupported => "shell.updater.unsupportedPlatform",
            ShellError::UpdaterInvalidPath(_) => "shell.updater.invalidPath",
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
            ShellError::Io(_) => ("error", true),
            ShellError::InvalidPrefs(_) => ("warning", false),
            ShellError::UpdaterNetwork(_) => ("error", true),
            ShellError::UpdaterNotFound(_) => ("warning", false),
            ShellError::UpdaterNoAsset(_) => ("warning", false),
            ShellError::UpdaterUnsupported => ("warning", false),
            ShellError::UpdaterInvalidPath(_) => ("error", false),
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
