"""按平台 / 环境变量选择 driver（默认 mock，保证 CI 无显示器可跑）。"""

from __future__ import annotations

import os
import sys
from typing import Literal

from lanius_engine.drivers.base import Driver
from lanius_engine.drivers.linux import LinuxDriver
from lanius_engine.drivers.macos import MacosDriver
from lanius_engine.drivers.mock import MockDriver
from lanius_engine.drivers.windows import WindowsDriver
from lanius_engine.models import LaniusError

DriverName = Literal["mock", "windows", "macos", "linux", "auto"]


def resolve_driver_name(prefer: str | None = None) -> DriverName:
    raw = (prefer or os.environ.get("LANIUS_DRIVER") or "mock").strip().lower()
    if raw == "auto":
        if sys.platform == "win32":
            return "windows"
        if sys.platform == "darwin":
            return "macos"
        # Linux CI / 无显示器：auto → mock；显式 linux 才用占位 driver
        return "mock"
    if raw in ("mock", "windows", "macos", "linux"):
        return raw  # type: ignore[return-value]
    raise LaniusError.of(
        "engine.driver.unknownBackend",
        f"未知 driver 选择: {raw}",
        details={"prefer": raw},
    )


def create_driver(prefer: str | None = None) -> Driver:
    name = resolve_driver_name(prefer)
    drivers: dict[DriverName, type[Driver]] = {
        "mock": MockDriver,
        "windows": WindowsDriver,
        "macos": MacosDriver,
        "linux": LinuxDriver,
        "auto": MockDriver,  # resolve 已展开；占位满足穷尽
    }
    return drivers[name]()
