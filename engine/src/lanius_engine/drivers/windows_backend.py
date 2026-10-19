"""Windows 桌面后端：真实 pywinauto 与可注入假实现（CI 无 Windows 时测绑定）。"""

from __future__ import annotations

import re
import subprocess
from typing import Any, Protocol

from lanius_engine.drivers.recording_backend import RecordingDesktopBackend

# 兼容旧名：测试与导出仍用 RecordingWindowsBackend
RecordingWindowsBackend = RecordingDesktopBackend


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

    def launch(self, cmd: str | list[str]) -> int: ...

    def terminate(self, pid: int) -> None: ...

    def find_element(self, locator: dict[str, Any]) -> str: ...

    def element_click(self, locator: dict[str, Any]) -> None: ...


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
        self._elements: dict[str, Any] = {}
        self._procs: dict[int, Any] = {}

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

    def launch(self, cmd: str | list[str]) -> int:
        from pywinauto import Application  # type: ignore[import-not-found]

        args = cmd if isinstance(cmd, list) else [cmd]
        app = Application(backend="uia").start(" ".join(args))
        pid = int(app.process)
        self._procs[pid] = app
        try:
            win = app.top_window()
            handle = str(int(win.handle))
            self._windows[handle] = win
        except Exception:
            pass
        return pid

    def terminate(self, pid: int) -> None:
        app = self._procs.pop(pid, None)
        if app is not None:
            try:
                app.kill()
                return
            except Exception:
                pass
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/F"],
            check=False,
            capture_output=True,
        )

    def find_element(self, locator: dict[str, Any]) -> str:
        name = str(locator.get("name", locator.get("title", ""))).strip()
        auto_id = str(locator.get("automationId", locator.get("auto_id", ""))).strip()
        control_type = str(locator.get("controlType", "")).strip()
        root = None
        if self._windows:
            root = next(iter(self._windows.values()))
        if root is None:
            raise LookupError(f"element not found (no active window): {locator}")
        spec: dict[str, Any] = {}
        if name:
            spec["title"] = name
        if auto_id:
            spec["auto_id"] = auto_id
        if control_type:
            spec["control_type"] = control_type
        try:
            el = root.child_window(**spec)
            if not el.exists(timeout=1):
                raise LookupError(f"element not found: {locator}")
            eid = str(id(el))
            self._elements[eid] = el
            return eid
        except LookupError:
            raise
        except Exception as exc:
            raise LookupError(f"element not found: {locator}") from exc

    def element_click(self, locator: dict[str, Any]) -> None:
        eid = self.find_element(locator)
        el = self._elements[eid]
        el.click_input()
