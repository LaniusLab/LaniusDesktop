"""平台 driver 占位：未就绪或非本平台时抛统一错误码。"""

from __future__ import annotations

from typing import Any, ClassVar, NoReturn

from lanius_engine.drivers.base import Driver
from lanius_engine.drivers.capabilities import Capability
from lanius_engine.models import LaniusError


class UnsupportedDriver(Driver):
    """未接通的真实 driver：所有调用给出可诊断错误，供矩阵与工厂测试。"""

    platform: ClassVar[str] = "unknown"
    backend: ClassVar[str] = "none"

    def __init__(
        self,
        *,
        reason: str,
        detail: str | None = None,
    ) -> None:
        self._reason = reason
        self._detail = detail

    def _fail(self, capability: Capability) -> NoReturn:
        code = (
            "engine.driver.backendMissing"
            if self._reason == "backend_missing"
            else "engine.driver.unsupportedPlatform"
            if self._reason == "wrong_platform"
            else "engine.driver.notImplemented"
        )
        raise LaniusError.of(
            code,
            self._detail
            or f"driver {self.platform}/{self.backend} 不可用（{capability}）",
            details={
                "platform": self.platform,
                "backend": self.backend,
                "capability": capability,
                "reason": self._reason,
            },
            retryable=False,
        )

    async def click(self, x: int, y: int, button: str = "left") -> None:
        self._fail("mouse.click")

    async def move(self, x: int, y: int) -> None:
        self._fail("mouse.move")

    async def press(self, keys: str) -> None:
        self._fail("keyboard.press")

    async def type_text(self, text: str) -> None:
        self._fail("keyboard.type")

    async def find_window(self, query: dict[str, Any]) -> str:
        self._fail("window.find")

    async def activate(self, handle: str) -> None:
        self._fail("window.activate")

    async def set_locate(self, locate: dict[str, Any]) -> None:
        self._fail("window.activate")

    async def clipboard_get(self) -> str:
        self._fail("clipboard")

    async def clipboard_set(self, text: str) -> None:
        self._fail("clipboard")

    async def launch(self, cmd: str | list[str]) -> int:
        self._fail("process.launch")

    async def terminate(self, pid: int) -> None:
        self._fail("process.terminate")

    async def find_element(self, locator: dict[str, Any]) -> str:
        self._fail("element.find")

    async def element_click(self, locator: dict[str, Any]) -> None:
        self._fail("element.click")
