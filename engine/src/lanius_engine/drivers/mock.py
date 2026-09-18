"""Mock driver：维护内存虚拟桌面，供 CI、单测与 dry-run 使用（ENGINE.md §3.3）。

不是空实现——操作改变虚拟状态并留下调用轨迹，测试据此断言节点行为。
"""

from dataclasses import dataclass, field
from typing import Any

from lanius_engine.drivers.base import Driver
from lanius_engine.models import LaniusError


@dataclass
class MockCall:
    method: str
    args: tuple[Any, ...]
    kwargs: dict[str, Any]


@dataclass
class MockDriver(Driver):
    calls: list[MockCall] = field(default_factory=list)
    clipboard: str = ""
    windows: dict[str, dict[str, Any]] = field(default_factory=dict)
    cursor: tuple[int, int] = (0, 0)

    def _record(self, method: str, *args: Any, **kwargs: Any) -> None:
        self.calls.append(MockCall(method=method, args=args, kwargs=kwargs))

    async def click(self, x: int, y: int, button: str = "left") -> None:
        self._record("click", x, y, button=button)
        self.cursor = (x, y)

    async def move(self, x: int, y: int) -> None:
        self._record("move", x, y)
        self.cursor = (x, y)

    async def press(self, keys: str) -> None:
        self._record("press", keys)

    async def type_text(self, text: str) -> None:
        self._record("type_text", text)

    async def find_window(self, query: dict[str, Any]) -> str:
        self._record("find_window", query)
        title = str(query.get("title", ""))
        exe = str(query.get("exe", ""))
        class_name = str(query.get("className", query.get("class_name", "")))
        for handle, info in self.windows.items():
            if title and title in str(info.get("title", "")):
                return handle
            if exe and exe == str(info.get("exe", "")):
                return handle
            if class_name and class_name == str(info.get("className", "")):
                return handle
        if self.windows:
            raise LaniusError.of(
                "engine.driver.windowNotFound",
                f"未找到窗口: {query}",
                details={"query": query},
                retryable=True,
            )
        handle = "hwnd-mock"
        self.windows[handle] = {"title": title, "exe": exe, "className": class_name}
        return handle

    async def clipboard_get(self) -> str:
        self._record("clipboard_get")
        return self.clipboard

    async def clipboard_set(self, text: str) -> None:
        self._record("clipboard_set", text)
        self.clipboard = text
