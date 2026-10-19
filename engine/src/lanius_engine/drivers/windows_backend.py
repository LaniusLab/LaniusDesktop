"""Windows 桌面后端：真实 pywinauto 与可注入假实现（CI 无 Windows 时测绑定）。"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Protocol


class WindowsBackend(Protocol):
    """同步阻塞 API；WindowsDriver 经 asyncio.to_thread 调用。"""

    def click(self, x: int, y: int, button: str) -> None: ...

    def move(self, x: int, y: int) -> None: ...

    def press(self, keys: str) -> None: ...

    def type_text(self, text: str) -> None: ...

    def find_window(self, query: dict[str, Any]) -> str: ...

    def activate(self, handle: str) -> None: ...

    def clipboard_get(self) -> str: ...

    def clipboard_set(self, text: str) -> None: ...


@dataclass
class RecordingWindowsBackend:
    """单测假后端：记录调用并维护简易窗口/剪贴板状态。"""

    calls: list[tuple[str, tuple[Any, ...]]] = field(default_factory=list)
    clipboard: str = ""
    windows: dict[str, dict[str, Any]] = field(default_factory=dict)
    cursor: tuple[int, int] = (0, 0)
    bound_handle: str | None = None

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


class PywinautoBackend:
    """真实 pywinauto（UIA）绑定；仅在 win32 + 已安装 extra 时构造。"""

    def __init__(self) -> None:
        from pywinauto import Desktop, keyboard, mouse  # type: ignore[import-not-found]
        from pywinauto import clipboard as pw_clipboard  # type: ignore[import-not-found]

        self._desktop = Desktop(backend="uia")
        self._mouse = mouse
        self._keyboard = keyboard
        self._clipboard = pw_clipboard
        self._windows: dict[str, Any] = {}

    def click(self, x: int, y: int, button: str) -> None:
        btn = button if button in ("left", "right", "middle") else "left"
        self._mouse.click(button=btn, coords=(x, y))

    def move(self, x: int, y: int) -> None:
        self._mouse.move(coords=(x, y))

    def press(self, keys: str) -> None:
        # 步骤 keys 与 pywinauto send_keys 语法对齐（如 ^a、{ENTER}）
        self._keyboard.send_keys(keys, with_spaces=True, pause=0.01)

    def type_text(self, text: str) -> None:
        self._keyboard.send_keys(text, with_spaces=True, pause=0.01)

    def find_window(self, query: dict[str, Any]) -> str:
        title = str(query.get("title", "")).strip()
        exe = str(query.get("exe", "")).strip().casefold()
        class_name = str(query.get("className", query.get("class_name", ""))).strip()

        for win in self._desktop.windows():
            try:
                if title and title not in str(win.window_text()):
                    continue
                if class_name:
                    if str(getattr(win.element_info, "class_name", "")) != class_name:
                        continue
                if exe:
                    # 进程名粗匹配：完整路径或裸名
                    name = str(getattr(win.element_info, "name", "")).casefold()
                    if exe not in name and not name.endswith(exe):
                        # 仍允许仅 title/class 命中时接受（exe 信息常不可得）
                        if not title and not class_name:
                            continue
                handle = str(int(win.handle))
                self._windows[handle] = win
                return handle
            except Exception:
                continue

        # 退路：title_re 直接构造
        if title or class_name:
            spec: dict[str, Any] = {}
            if title:
                spec["title_re"] = f".*{re.escape(title)}.*"
            if class_name:
                spec["class_name"] = class_name
            try:
                win = self._desktop.window(**spec)
                if win.exists(timeout=1):
                    handle = str(int(win.handle))
                    self._windows[handle] = win
                    return handle
            except Exception:
                pass
        raise LookupError(f"window not found: {query}")

    def activate(self, handle: str) -> None:
        win = self._windows.get(handle)
        if win is None:
            try:
                hwnd = int(handle)
            except ValueError as exc:
                raise LookupError(f"unknown handle: {handle}") from exc
            win = self._desktop.window(handle=hwnd)
            self._windows[handle] = win
        win.set_focus()

    def clipboard_get(self) -> str:
        try:
            data = self._clipboard.GetData()
            return "" if data is None else str(data)
        except Exception:
            return ""

    def clipboard_set(self, text: str) -> None:
        # pywinauto.clipboard 在部分版本仅有 GetData；失败时明确抛出让上层映射错误码
        setter = getattr(self._clipboard, "SetData", None)
        if callable(setter):
            setter(text)
            return
        # 兼容：EmptyClipboard + win32 API 若可用
        try:
            import win32clipboard  # type: ignore[import-not-found,import-untyped]

            win32clipboard.OpenClipboard()
            try:
                win32clipboard.EmptyClipboard()
                win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT, text)
            finally:
                win32clipboard.CloseClipboard()
        except Exception as exc:
            raise RuntimeError("clipboard set unavailable") from exc
