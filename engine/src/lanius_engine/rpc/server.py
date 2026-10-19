"""JSON-RPC 2.0 over stdio 服务循环（NDJSON 帧，见 docs/PROTOCOL.md）。

纪律：stdout 只写协议帧；日志一律走 stderr。方法经 @register 注册制挂载，
未识别方法返回 -32601；业务异常必须已映射为 LaniusError（ADR-0008）。

请求并发：长调用（如 flow.start）期间仍可读入 pause/cancel；写帧经锁串行化。
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
from collections.abc import Awaitable, Callable
from contextvars import ContextVar
from typing import Any

from lanius_engine.logging import get_logger
from lanius_engine.models import EngineError, LaniusError

MAX_FRAME_BYTES = 1024 * 1024  # 1 MiB，超限断开（PROTOCOL.md §1）
HEARTBEAT_INTERVAL_S = 30.0

Handler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]
ActiveCountFn = Callable[[], int]

logger = get_logger(module="rpc")
_current_trace_id: ContextVar[str] = ContextVar("rpc_trace_id", default="")


class RpcServer:
    def __init__(self) -> None:
        self._methods: dict[str, Handler] = {}
        self._started_at = time.monotonic()
        self._shutdown = asyncio.Event()
        self._write_lock = asyncio.Lock()
        self.active_executions_fn: ActiveCountFn = lambda: 0
        self.heartbeat_interval_s = HEARTBEAT_INTERVAL_S

    @property
    def current_trace_id(self) -> str:
        return _current_trace_id.get()

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
        # 同步路径：通知多在执行器回调里触发；写锁用 create_task 不现实，改直接写
        # 并用 threading 不安全假设：asyncio 单线程，写帧原子性由 GIL + 行缓冲保证。
        self._write_frame_unlocked({"jsonrpc": "2.0", "method": method, "params": payload})

    async def serve(self) -> int:
        loop = asyncio.get_running_loop()
        reader = asyncio.StreamReader(limit=MAX_FRAME_BYTES)
        await loop.connect_read_pipe(lambda: asyncio.StreamReaderProtocol(reader), sys.stdin)

        pending: set[asyncio.Task[None]] = set()
        heartbeat = asyncio.create_task(self._heartbeat_loop(), name="engine.heartbeat")

        try:
            while not self._shutdown.is_set():
                read_task = asyncio.create_task(reader.readline())
                stop_task = asyncio.create_task(self._shutdown.wait())
                done, _ = await asyncio.wait(
                    {read_task, stop_task}, return_when=asyncio.FIRST_COMPLETED
                )
                if stop_task in done:
                    read_task.cancel()
                    try:
                        await read_task
                    except (asyncio.CancelledError, ValueError):
                        pass
                    break
                stop_task.cancel()
                try:
                    await stop_task
                except asyncio.CancelledError:
                    pass
                try:
                    line = read_task.result()
                except ValueError:
                    logger.error("transport.frameTooLarge", limit=MAX_FRAME_BYTES)
                    return 2
                if not line:
                    break
                task = asyncio.create_task(self._dispatch(line))
                pending.add(task)
                task.add_done_callback(pending.discard)
            if pending:
                await asyncio.gather(*pending, return_exceptions=True)
            return 0
        finally:
            heartbeat.cancel()
            try:
                await heartbeat
            except asyncio.CancelledError:
                pass

    async def _heartbeat_loop(self) -> None:
        while not self._shutdown.is_set():
            try:
                await asyncio.wait_for(
                    self._shutdown.wait(), timeout=self.heartbeat_interval_s
                )
                return
            except TimeoutError:
                self.notify(
                    "engine.heartbeat",
                    {
                        "uptimeMs": self.uptime_ms,
                        "activeExecutions": int(self.active_executions_fn()),
                    },
                )

    async def _dispatch(self, line: bytes) -> None:
        response = await self.handle_frame(line)
        if response is not None:
            async with self._write_lock:
                self._write_frame_unlocked(response)

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

        token = _current_trace_id.set(trace_id)
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
            _current_trace_id.reset(token)

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

    def _write_frame_unlocked(self, frame: dict[str, Any]) -> None:
        payload = json.dumps(frame, ensure_ascii=False, separators=(",", ":"))
        sys.stdout.write(payload + "\n")
        sys.stdout.flush()
