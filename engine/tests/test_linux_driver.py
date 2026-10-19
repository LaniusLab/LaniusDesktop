"""LinuxDriver：注入 RecordingLinuxBackend，覆盖绑定路径。"""

from __future__ import annotations

import sys

import pytest

from lanius_engine.drivers.linux import LinuxDriver
from lanius_engine.drivers.linux_backend import RecordingLinuxBackend
from lanius_engine.models import LaniusError


@pytest.mark.asyncio
async def test_injected_backend_mouse_keyboard_clipboard() -> None:
    backend = RecordingLinuxBackend()
    driver = LinuxDriver(backend=backend)

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
    backend = RecordingLinuxBackend(
        windows={"42": {"title": "gedit", "exe": "gedit", "className": ""}}
    )
    driver = LinuxDriver(backend=backend)
    handle = await driver.find_window({"title": "gedit"})
    assert handle == "42"
    await driver.activate(handle)
    assert backend.bound_handle == "42"


@pytest.mark.asyncio
async def test_window_not_found_maps_error() -> None:
    backend = RecordingLinuxBackend(
        windows={"1": {"title": "其他", "exe": "x", "className": ""}}
    )
    driver = LinuxDriver(backend=backend)
    with pytest.raises(LaniusError) as err:
        await driver.find_window({"title": "不存在"})
    assert err.value.error.code == "engine.driver.windowNotFound"


@pytest.mark.asyncio
async def test_linux_without_inject_blocked_or_not_implemented() -> None:
    driver = LinuxDriver()
    with pytest.raises(LaniusError) as err:
        await driver.press("a")
    if sys.platform.startswith("linux"):
        assert err.value.error.code in {
            "engine.driver.backendMissing",
            "engine.driver.notImplemented",
        }
    else:
        assert err.value.error.code == "engine.driver.unsupportedPlatform"
