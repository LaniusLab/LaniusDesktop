"""Windows driver：pywinauto（UIA）。本切片先接线选择与错误码；真实绑定随后续 PR。"""

from __future__ import annotations

import sys
from typing import ClassVar

from lanius_engine.drivers.unsupported import UnsupportedDriver


class WindowsDriver(UnsupportedDriver):
    platform: ClassVar[str] = "windows"
    backend: ClassVar[str] = "pywinauto"

    def __init__(self) -> None:
        if sys.platform != "win32":
            super().__init__(
                reason="wrong_platform",
                detail="Windows driver 仅在 win32 可用；当前平台不是 Windows",
            )
            return
        try:
            import pywinauto  # type: ignore[import-not-found]  # noqa: F401
        except ImportError:
            super().__init__(
                reason="backend_missing",
                detail="未安装 pywinauto；请安装 optional extra: lanius-engine[windows]",
            )
            return
        # 后端已装但节点级绑定尚未合入——调用仍给出明确错误，避免空操作
        super().__init__(
            reason="not_implemented",
            detail="Windows/pywinauto 已检测到，键鼠绑定实现尚未合入本版本",
        )
