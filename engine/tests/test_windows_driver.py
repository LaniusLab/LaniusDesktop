"""WindowsDriver：注入 RecordingWindowsBackend，在非 Windows CI 上覆盖真实绑定路径。"""

from __future__ import annotations

import sys

import pytest

from lanius_engine.drivers.windows import WindowsDriver
from lanius_engine.drivers.windows_backend import RecordingWindowsBackend
from lanius_engine.models import LaniusError


@pytest.mark.asyncio
async def test_injected_backend_mouse_keyboard_clipboard() -> None:
    backend = RecordingWindowsBackend()
    driver = WindowsDriver(backend=backend)

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
    backend = RecordingWindowsBackend(
        windows={"42": {"title": "记事本", "exe": "notepad.exe", "className": "Notepad"}}
    )
    driver = WindowsDriver(backend=backend)
    handle = await driver.find_window({"title": "记事本"})
    assert handle == "42"
    await driver.activate(handle)
    assert backend.bound_handle == "42"


@pytest.mark.asyncio
async def test_window_not_found_maps_error() -> None:
    backend = RecordingWindowsBackend(
        windows={"1": {"title": "其他", "exe": "x.exe", "className": ""}}
    )
    driver = WindowsDriver(backend=backend)
    with pytest.raises(LaniusError) as err:
        await driver.find_window({"title": "不存在"})
    assert err.value.error.code == "engine.driver.windowNotFound"


@pytest.mark.asyncio
async def test_off_windows_without_inject_still_blocked() -> None:
    if sys.platform == "win32":
        pytest.skip("本机即 Windows")
    driver = WindowsDriver()
    with pytest.raises(LaniusError) as err:
        await driver.press("a")
    assert err.value.error.code == "engine.driver.unsupportedPlatform"
