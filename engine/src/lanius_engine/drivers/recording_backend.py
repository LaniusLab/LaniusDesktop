"""可注入 Recording 桌面后端：三平台 CI 共用（无 pywinauto / pyobjc / pyatspi）。"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class RecordingDesktopBackend:
    """单测假后端：记录调用并维护简易窗口/剪贴板/进程/元素状态。"""

    calls: list[tuple[str, tuple[Any, ...]]] = field(default_factory=list)
    clipboard: str = ""
    windows: dict[str, dict[str, Any]] = field(default_factory=dict)
    elements: dict[str, dict[str, Any]] = field(default_factory=dict)
    processes: dict[int, str | list[str]] = field(default_factory=dict)
    cursor: tuple[int, int] = (0, 0)
    bound_handle: str | None = None
    _next_pid: int = 2000

    def click(self, x: int, y: int, button: str) -> None:
        self.calls.append(("click", (x, y, button)))
        self.cursor = (x, y)

    def move(self, x: int, y: int) -> None:
        self.calls.append(("move", (x, y)))
        self.cursor = (x, y)

    def press(self, keys: str) -> None:
        self.calls.append(("press", (keys,)))

    def type_text(self, text: str) -> None:
        self.calls.append(("type_text", (text,)))

    def find_window(self, query: dict[str, Any]) -> str:
        self.calls.append(("find_window", (query,)))
        title = str(query.get("title", ""))
        exe = str(query.get("exe", ""))
        class_name = str(query.get("className", query.get("class_name", "")))
        for handle, info in self.windows.items():
            if title and title in str(info.get("title", "")):
                return handle
            if exe and exe.casefold() == str(info.get("exe", "")).casefold():
                return handle
            if class_name and class_name == str(info.get("className", "")):
                return handle
        if self.windows:
            raise LookupError(f"window not found: {query}")
        handle = "hwnd-1"
        self.windows[handle] = {"title": title, "exe": exe, "className": class_name}
        return handle

    def activate(self, handle: str) -> None:
        self.calls.append(("activate", (handle,)))
        if handle not in self.windows:
            raise LookupError(f"unknown handle: {handle}")
        self.bound_handle = handle

    def clipboard_get(self) -> str:
        self.calls.append(("clipboard_get", ()))
        return self.clipboard

    def clipboard_set(self, text: str) -> None:
        self.calls.append(("clipboard_set", (text,)))
        self.clipboard = text

    def launch(self, cmd: str | list[str]) -> int:
        self.calls.append(("launch", (cmd,)))
        self._next_pid += 1
        pid = self._next_pid
        self.processes[pid] = cmd
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

    def terminate(self, pid: int) -> None:
        self.calls.append(("terminate", (pid,)))
        self.processes.pop(pid, None)
        gone = [h for h, info in self.windows.items() if info.get("pid") == pid]
        for handle in gone:
            self.windows.pop(handle, None)

    def find_element(self, locator: dict[str, Any]) -> str:
        self.calls.append(("find_element", (locator,)))
        name = str(locator.get("name", locator.get("title", "")))
        auto_id = str(locator.get("automationId", locator.get("auto_id", "")))
        for eid, info in self.elements.items():
            if name and name == str(info.get("name", "")):
                return eid
            if auto_id and auto_id == str(info.get("automationId", "")):
                return eid
        if self.elements:
            raise LookupError(f"element not found: {locator}")
        eid = "el-1"
        self.elements[eid] = {
            "name": name,
            "automationId": auto_id,
            "controlType": locator.get("controlType", ""),
        }
        return eid

    def element_click(self, locator: dict[str, Any]) -> None:
        eid = self.find_element(locator)
        self.calls.append(("element_click", (locator, eid)))
