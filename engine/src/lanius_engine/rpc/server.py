"""JSON-RPC 2.0 over stdio 服务循环（NDJSON 帧，见 docs/PROTOCOL.md）。

纪律：stdout 只写协议帧；日志一律走 stderr。方法经 @register 注册制挂载，
未识别方法返回 -32601；业务异常必须已映射为 LaniusError（ADR-0008）。
"""

import asyncio
import json
import sys
import time
from collections.abc import Awaitable, Callable
from typing import Any

from lanius_engine.logging import get_logger
from lanius_engine.models import EngineError, LaniusError

MAX_FRAME_BYTES = 1024 * 1024  # 1 MiB，超限断开（PROTOCOL.md §1）

Handler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]

logger = get_logger(module="rpc")


class RpcServer:
    def __init__(self) -> None:
        self._methods: dict[str, Handler] = {}
        self._started_at = time.monotonic()
        self._shutdown = asyncio.Event()
        # 当前请求的 traceId：通知帧注入用；请求间隙为空串
        self.current_trace_id: str = ""

    def register(self, name: str, handler: Handler) -> None:
        if name in self._methods:
            raise ValueError(f"RPC 方法重复注册: {name}")
        self._methods[name] = handler

    @property
    def method_names(self) -> list[str]:
        return sorted(self._methods)

    @property
    def uptime_ms(self) -> int:
        return int((time.monotonic() - self._started_at) * 1000)

    def stop(self) -> None:
        self._shutdown.set()

    def notify(self, method: str, params: dict[str, Any] | None = None) -> None:
        """向壳发出无 id 通知帧（PROTOCOL.md §2 / §3.3）。stdout 只走协议。"""
        payload = dict(params or {})
        if self.current_trace_id and "traceId" not in payload:
            payload["traceId"] = self.current_trace_id
        self._write_frame({"jsonrpc": "2.0", "method": method, "params": payload})


    async def serve(self) -> int:
        loop = asyncio.get_running_loop()
        reader = asyncio.StreamReader(limit=MAX_FRAME_BYTES)
        await loop.connect_read_pipe(lambda: asyncio.StreamReaderProtocol(reader), sys.stdin)

        while not self._shutdown.is_set():
            try:
                line = await reader.readline()
            except ValueError:
                logger.error("transport.frameTooLarge", limit=MAX_FRAME_BYTES)
                return 2
            if not line:
                break
            response = await self.handle_frame(line)
            if response is not None:
                self._write_frame(response)
        return 0

    async def handle_frame(self, line: bytes) -> dict[str, Any] | None:
        try:
            frame = json.loads(line)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return self._error_frame(None, -32700, "Parse error")
        if not isinstance(frame, dict):
            return self._error_frame(None, -32600, "Invalid Request")

        frame_id = frame.get("id")
        method = frame.get("method")
        params = frame.get("params") or {}
        meta = frame.get("meta") or {}
        trace_id = str(meta.get("traceId", ""))

        if not isinstance(method, str) or not isinstance(params, dict):
            return self._error_frame(frame_id, -32600, "Invalid Request")

        handler = self._methods.get(method)
        if handler is None:
            return self._error_frame(
                frame_id, -32601, "Method not found", {"methodName": method}
            )

        previous_trace = self.current_trace_id
        self.current_trace_id = trace_id
        try:
            result = await handler(params)
        except LaniusError as err:
            err.error.trace_id = err.error.trace_id or trace_id
            return {"jsonrpc": "2.0", "id": frame_id, "error": err.error.to_rpc_error()}
        except Exception as exc:  # 兜底：未映射异常统一进错误模型，堆栈只进日志
            logger.exception("engine.internal.unexpected", method=method, traceId=trace_id)
            error = EngineError(
                code="engine.internal.unexpected",
                message=f"引擎内部错误: {type(exc).__name__}",
                severity="fatal",
                trace_id=trace_id,
            )
            return {"jsonrpc": "2.0", "id": frame_id, "error": error.to_rpc_error()}
        finally:
            self.current_trace_id = previous_trace

        if frame_id is None:  # 通知无响应
            return None
        return {"jsonrpc": "2.0", "id": frame_id, "result": result}

    def _error_frame(
        self, frame_id: Any, code: int, message: str, data: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        error: dict[str, Any] = {"code": code, "message": message}
        if data:
            error["data"] = data
        return {"jsonrpc": "2.0", "id": frame_id, "error": error}

    def _write_frame(self, frame: dict[str, Any]) -> None:
        payload = json.dumps(frame, ensure_ascii=False, separators=(",", ":"))
        sys.stdout.write(payload + "\n")
        sys.stdout.flush()
