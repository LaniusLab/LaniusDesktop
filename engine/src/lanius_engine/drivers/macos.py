"""macOS driver：pyobjc AX。本切片仅占位与错误码；需辅助功能授权引导。"""

from __future__ import annotations

import sys
from typing import ClassVar

from lanius_engine.drivers.unsupported import UnsupportedDriver


class MacosDriver(UnsupportedDriver):
    platform: ClassVar[str] = "macos"
    backend: ClassVar[str] = "pyobjc"

    def __init__(self) -> None:
        if sys.platform != "darwin":
            super().__init__(
                reason="wrong_platform",
                detail="macOS driver 仅在 darwin 可用",
            )
            return
        try:
            import ApplicationServices  # type: ignore[import-not-found]  # noqa: F401
        except ImportError:
            super().__init__(
                reason="backend_missing",
                detail="未安装 pyobjc；请安装 optional extra: lanius-engine[macos]",
            )
            return
        super().__init__(
            reason="not_implemented",
            detail="macOS/AX 能力子集尚未合入；需辅助功能授权引导",
        )
