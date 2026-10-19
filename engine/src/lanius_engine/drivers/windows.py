"""Windows driver：pywinauto（UIA）真实绑定；可注入 backend 供 Linux CI 测路径。"""

from __future__ import annotations

import asyncio
import sys
from typing import Any, ClassVar

from lanius_engine.drivers.base import Driver
from lanius_engine.drivers.capabilities import Capability
from lanius_engine.drivers.windows_backend import (
    PywinautoBackend,
    WindowsBackend,
)
from lanius_engine.models import LaniusError


class WindowsDriver(Driver):
    platform: ClassVar[str] = "windows"
    backend: ClassVar[str] = "pywinauto"

    def __init__(self, *, backend: WindowsBackend | None = None) -> None:
        self._locate: dict[str, Any] | None = None
        self._bound_handle: str | None = None
        self._impl: WindowsBackend | None = backend
        self._block_reason: str | None = None
        self._block_detail: str | None = None

        if backend is not None:
            return
        if sys.platform != "win32":
            self._block_reason = "wrong_platform"
            self._block_detail = "Windows driver 仅在 win32 可用；当前平台不是 Windows"
            return
        try:
            self._impl = PywinautoBackend()
        except ImportError:
            self._block_reason = "backend_missing"
            self._block_detail = (
                "未安装 pywinauto；请安装 optional extra: lanius-engine[windows]"
            )

    def _require(self, capability: Capability) -> WindowsBackend:
        if self._block_reason is not None or self._impl is None:
            code = (
                "engine.driver.backendMissing"
                if self._block_reason == "backend_missing"
                else "engine.driver.unsupportedPlatform"
            )
            raise LaniusError.of(
                code,
                self._block_detail
                or f"Windows driver 不可用（{capability}）",
                details={
                    "platform": self.platform,
                    "backend": self.backend,
                    "capability": capability,
                    "reason": self._block_reason or "unavailable",
                },
                retryable=False,
            )
        return self._impl

    async def _call(self, capability: Capability, method: str, *args: Any) -> Any:
        impl = self._require(capability)
        fn = getattr(impl, method)
        try:
            return await asyncio.to_thread(fn, *args)
        except LookupError as exc:
            code = (
                "engine.driver.elementNotFound"
                if capability.startswith("element.")
                else "engine.driver.windowNotFound"
            )
            raise LaniusError.of(
                code,
                str(exc),
                details={"capability": capability},
                retryable=True,
            ) from exc
        except LaniusError:
            raise
        except Exception as exc:
            raise LaniusError.of(
                "engine.driver.actionFailed",
                f"Windows driver 调用失败: {exc}",
                details={"capability": capability, "error": str(exc)},
                retryable=True,
            ) from exc

    async def click(self, x: int, y: int, button: str = "left") -> None:
        await self._call("mouse.click", "click", x, y, button)

    async def move(self, x: int, y: int) -> None:
        await self._call("mouse.move", "move", x, y)

    async def press(self, keys: str) -> None:
        await self._call("keyboard.press", "press", keys)

    async def type_text(self, text: str) -> None:
        await self._call("keyboard.type", "type_text", text)

    async def find_window(self, query: dict[str, Any]) -> str:
        handle = await self._call("window.find", "find_window", query)
        return str(handle)

    async def activate(self, handle: str) -> None:
        await self._call("window.activate", "activate", handle)
        self._bound_handle = handle

    async def set_locate(self, locate: dict[str, Any]) -> None:
        # 定位通道记在 driver；元素级操作后续切片使用
        self._locate = locate

    async def clipboard_get(self) -> str:
        result = await self._call("clipboard", "clipboard_get")
        return str(result)

    async def clipboard_set(self, text: str) -> None:
        await self._call("clipboard", "clipboard_set", text)

    async def launch(self, cmd: str | list[str]) -> int:
        pid = await self._call("process.launch", "launch", cmd)
        return int(pid)

    async def terminate(self, pid: int) -> None:
        await self._call("process.terminate", "terminate", pid)

    async def find_element(self, locator: dict[str, Any]) -> str:
        eid = await self._call("element.find", "find_element", locator)
        return str(eid)

    async def element_click(self, locator: dict[str, Any]) -> None:
        await self._call("element.click", "element_click", locator)
