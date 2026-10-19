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
    elements: dict[str, dict[str, Any]] = field(default_factory=dict)
    processes: dict[int, str | list[str]] = field(default_factory=dict)
    cursor: tuple[int, int] = (0, 0)
    bound_handle: str | None = None
    locate: dict[str, Any] | None = None
    _next_pid: int = 1000

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

    async def activate(self, handle: str) -> None:
        self._record("activate", handle)
        self.bound_handle = handle

    async def set_locate(self, locate: dict[str, Any]) -> None:
        self._record("set_locate", locate)
        self.locate = locate

    async def clipboard_get(self) -> str:
        self._record("clipboard_get")
        return self.clipboard

    async def clipboard_set(self, text: str) -> None:
        self._record("clipboard_set", text)
        self.clipboard = text

    async def launch(self, cmd: str | list[str]) -> int:
        self._record("launch", cmd)
        self._next_pid += 1
        pid = self._next_pid
        self.processes[pid] = cmd
        # 记事本类启动：登记一个可查找窗口，便于 e2e
        exe = cmd[0] if isinstance(cmd, list) else str(cmd).split()[0]
        bare = exe.rsplit("\\", maxsplit=1)[-1].rsplit("/", maxsplit=1)[-1]
        handle = f"hwnd-{pid}"
        self.windows[handle] = {
            "title": "无标题 - 记事本" if "notepad" in bare.casefold() else bare,
            "exe": bare,
            "className": "Notepad" if "notepad" in bare.casefold() else "",
            "pid": pid,
        }
        return pid

    async def terminate(self, pid: int) -> None:
        self._record("terminate", pid)
        self.processes.pop(pid, None)
        gone = [h for h, info in self.windows.items() if info.get("pid") == pid]
        for handle in gone:
            self.windows.pop(handle, None)

    async def find_element(self, locator: dict[str, Any]) -> str:
        self._record("find_element", locator)
        name = str(locator.get("name", locator.get("title", "")))
        auto_id = str(locator.get("automationId", locator.get("auto_id", "")))
        for eid, info in self.elements.items():
            if name and name == str(info.get("name", "")):
                return eid
            if auto_id and auto_id == str(info.get("automationId", "")):
                return eid
        if self.elements:
            raise LaniusError.of(
                "engine.driver.elementNotFound",
                f"未找到元素: {locator}",
                details={"locator": locator},
                retryable=True,
            )
        eid = "el-mock"
        self.elements[eid] = {
            "name": name,
            "automationId": auto_id,
            "controlType": locator.get("controlType", ""),
        }
        return eid

    async def element_click(self, locator: dict[str, Any]) -> None:
        eid = await self.find_element(locator)
        self._record("element_click", locator, element_id=eid)
