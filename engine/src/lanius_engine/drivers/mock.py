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

    def _record(self, method: str, *args: Any, **kwargs: Any) -> None:
        self.calls.append(MockCall(method=method, args=args, kwargs=kwargs))

    async def click(self, x: int, y: int, button: str = "left") -> None:
        self._record("click", x, y, button=button)

    async def type_text(self, text: str) -> None:
        self._record("type_text", text)

    async def find_window(self, query: dict[str, Any]) -> str:
        self._record("find_window", query)
        title = str(query.get("title", ""))
        for handle, info in self.windows.items():
            if title and title in str(info.get("title", "")):
                return handle
        raise LaniusError.of(
            "engine.driver.windowNotFound",
            f"未找到窗口: {query}",
            details={"query": query},
            retryable=True,
        )

    async def clipboard_get(self) -> str:
        self._record("clipboard_get")
        return self.clipboard

    async def clipboard_set(self, text: str) -> None:
        self._record("clipboard_set", text)
        self.clipboard = text
