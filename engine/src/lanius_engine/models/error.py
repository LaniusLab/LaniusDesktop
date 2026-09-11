"""统一错误模型，真源为 schemas/error.schema.json（ADR-0008）。

字段变更必须先改 schema 再改本文件；CI 会校验漂移。
"""

from typing import Any, Literal

from pydantic import BaseModel, Field

Severity = Literal["info", "warning", "error", "fatal"]
Source = Literal["ui", "shell", "engine"]


class EngineError(BaseModel):
    code: str = Field(description="层.领域.原因，如 engine.flow.validationFailed")
    message: str
    severity: Severity = "error"
    source: Source = "engine"
    node_id: str | None = None
    trace_id: str = ""
    details: dict[str, Any] | None = None
    retryable: bool = False

    def to_rpc_error(self) -> dict[str, Any]:
        """映射为 JSON-RPC error 对象；code 字符串放入 data，RPC 层码固定 -32000。"""
        return {
            "code": -32000,
            "message": self.message,
            "data": self.model_dump(mode="json"),
        }


class LaniusError(Exception):
    """引擎内抛出业务错误的唯一方式；RPC 层捕获后映射为 EngineError。"""

    def __init__(self, error: EngineError) -> None:
        super().__init__(error.message)
        self.error = error

    @classmethod
    def of(
        cls,
        code: str,
        message: str,
        *,
        severity: Severity = "error",
        node_id: str | None = None,
        details: dict[str, Any] | None = None,
        retryable: bool = False,
    ) -> "LaniusError":
        return cls(
            EngineError(
                code=code,
                message=message,
                severity=severity,
                node_id=node_id,
                details=details,
                retryable=retryable,
            )
        )
