"""MacosDriver：注入 RecordingMacosBackend，在非 macOS CI 上覆盖绑定路径。"""

from __future__ import annotations

import sys

import pytest

from lanius_engine.drivers.macos import MacosDriver
from lanius_engine.drivers.macos_backend import RecordingMacosBackend
from lanius_engine.models import LaniusError


@pytest.mark.asyncio
async def test_injected_backend_mouse_keyboard_clipboard() -> None:
    backend = RecordingMacosBackend()
    driver = MacosDriver(backend=backend)

    await driver.move(10, 20)
    await driver.click(10, 20, "left")
    await driver.press("{ENTER}")
    await driver.type_text("hello")
    await driver.clipboard_set("clip")
    assert await driver.clipboard_get() == "clip"
    await driver.set_locate({"channel": "a11y"})

    assert backend.cursor == (10, 20)
    assert backend.clipboard == "clip"
    assert ("click", (10, 20, "left")) in backend.calls
    assert ("press", ("{ENTER}",)) in backend.calls
    assert ("type_text", ("hello",)) in backend.calls


@pytest.mark.asyncio
async def test_find_and_activate_window() -> None:
    backend = RecordingMacosBackend(
        windows={"42": {"title": "文本编辑", "exe": "TextEdit", "className": ""}}
    )
    driver = MacosDriver(backend=backend)
    handle = await driver.find_window({"title": "文本编辑"})
    assert handle == "42"
    await driver.activate(handle)
    assert backend.bound_handle == "42"


@pytest.mark.asyncio
async def test_window_not_found_maps_error() -> None:
    backend = RecordingMacosBackend(
        windows={"1": {"title": "其他", "exe": "x", "className": ""}}
    )
    driver = MacosDriver(backend=backend)
    with pytest.raises(LaniusError) as err:
        await driver.find_window({"title": "不存在"})
    assert err.value.error.code == "engine.driver.windowNotFound"


@pytest.mark.asyncio
async def test_off_macos_without_inject_still_blocked() -> None:
    if sys.platform == "darwin":
        pytest.skip("本机即 macOS")
    driver = MacosDriver()
    with pytest.raises(LaniusError) as err:
        await driver.press("a")
    assert err.value.error.code == "engine.driver.unsupportedPlatform"
