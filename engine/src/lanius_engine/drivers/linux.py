"""Linux driver：pyatspi。本切片仅占位与错误码。"""

from __future__ import annotations

import sys
from typing import ClassVar

from lanius_engine.drivers.unsupported import UnsupportedDriver


class LinuxDriver(UnsupportedDriver):
    platform: ClassVar[str] = "linux"
    backend: ClassVar[str] = "pyatspi"

    def __init__(self) -> None:
        if not sys.platform.startswith("linux"):
            super().__init__(
                reason="wrong_platform",
                detail="Linux driver 仅在 linux 可用",
            )
            return
        try:
            import pyatspi  # type: ignore[import-not-found]  # noqa: F401
        except ImportError:
            super().__init__(
                reason="backend_missing",
                detail="未安装 pyatspi；请安装 optional extra: lanius-engine[linux]",
            )
            return
        super().__init__(
            reason="not_implemented",
            detail="Linux/AT-SPI 能力子集尚未合入",
        )
