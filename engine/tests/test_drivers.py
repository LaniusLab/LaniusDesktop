"""M4 driver 工厂、能力矩阵与平台占位错误码。"""

from __future__ import annotations

import sys

import pytest

from lanius_engine.drivers import (
    PLATFORM_MATRIX,
    WindowsDriver,
    create_driver,
    resolve_driver_name,
    support_level,
)
from lanius_engine.drivers.mock import MockDriver
from lanius_engine.models import LaniusError


def test_default_create_driver_is_mock() -> None:
    driver = create_driver()
    assert isinstance(driver, MockDriver)


def test_resolve_explicit_and_unknown(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LANIUS_DRIVER", raising=False)
    assert resolve_driver_name("mock") == "mock"
    assert resolve_driver_name("windows") == "windows"
    with pytest.raises(LaniusError) as err:
        resolve_driver_name("niagara")
    assert err.value.error.code == "engine.driver.unknownBackend"


def test_auto_on_linux_stays_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "platform", "linux")
    assert resolve_driver_name("auto") == "mock"


def test_auto_on_windows_selects_windows(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "platform", "win32")
    assert resolve_driver_name("auto") == "windows"


@pytest.mark.asyncio
async def test_windows_driver_raises_unsupported_off_windows() -> None:
    if sys.platform == "win32":
        pytest.skip("本机即 Windows")
    driver = WindowsDriver()
    with pytest.raises(LaniusError) as err:
        await driver.click(1, 2)
    assert err.value.error.code == "engine.driver.unsupportedPlatform"
    assert err.value.error.details is not None
    assert err.value.error.details["platform"] == "windows"
    assert err.value.error.details["capability"] == "mouse.click"


@pytest.mark.asyncio
async def test_explicit_linux_driver_backend_or_not_implemented() -> None:
    driver = create_driver("linux")
    with pytest.raises(LaniusError) as err:
        await driver.press("a")
    assert err.value.error.code in {
        "engine.driver.backendMissing",
        "engine.driver.unsupportedPlatform",
        "engine.driver.notImplemented",
    }


@pytest.mark.asyncio
async def test_explicit_macos_driver_backend_or_not_implemented() -> None:
    driver = create_driver("macos")
    with pytest.raises(LaniusError) as err:
        await driver.click(1, 2)
    assert err.value.error.code in {
        "engine.driver.backendMissing",
        "engine.driver.unsupportedPlatform",
        "engine.driver.notImplemented",
    }
    assert err.value.error.details is not None
    assert err.value.error.details["platform"] == "macos"


def test_capability_matrix_covers_platforms() -> None:
    for platform in ("mock", "windows", "macos", "linux"):
        assert platform in PLATFORM_MATRIX
        assert support_level(platform, "mouse.click") in {
            "full",
            "subset",
            "mock",
            "planned",
        }
    assert support_level("windows", "element.find") == "full"
    assert support_level("mock", "element.find") == "mock"
    assert support_level("mock", "process.launch") == "mock"
