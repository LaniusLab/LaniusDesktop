"""记事本开→输入→保存轨迹：RecordingWindowsBackend 模拟，无需真 Windows。"""

from __future__ import annotations

import pytest

from lanius_engine.drivers.windows import WindowsDriver
from lanius_engine.drivers.windows_backend import RecordingWindowsBackend
from lanius_engine.models import FlowFile
from lanius_engine.nodes.registry import default_registry
from lanius_engine.runtime.executor import Executor
from lanius_engine.runtime.state import ExecutionState


@pytest.mark.asyncio
async def test_notepad_open_type_save_via_recording_backend() -> None:
    backend = RecordingWindowsBackend()
    driver = WindowsDriver(backend=backend)

    pid = await driver.launch(["notepad.exe"])
    handle = await driver.find_window({"exe": "notepad.exe"})
    await driver.activate(handle)
    await driver.set_locate({"channel": "a11y"})
    await driver.type_text("hello M4")
    await driver.element_click({"name": "文本编辑器", "controlType": "Edit"})
    await driver.press("^s")
    await driver.terminate(pid)

    methods = [name for name, _ in backend.calls]
    assert methods[0] == "launch"
    assert "find_window" in methods
    assert "type_text" in methods
    assert "find_element" in methods
    assert ("press", ("^s",)) in backend.calls
    assert ("terminate", (pid,)) in backend.calls
    assert pid not in backend.processes


@pytest.mark.asyncio
async def test_executor_runs_on_launched_notepad_window() -> None:
    backend = RecordingWindowsBackend()
    driver = WindowsDriver(backend=backend)
    pid = await driver.launch("notepad.exe")

    flow = FlowFile.model_validate(
        {
            "schemaVersion": 2,
            "id": "notepad-e2e",
            "name": "记事本输入",
            "target": {
                "match": {"exe": "notepad.exe"},
                "locate": {"channel": "a11y", "source": "user"},
            },
            "steps": [
                {"id": "type", "kind": "binding", "keys": "hello", "label": "输入"},
                {"id": "save", "kind": "binding", "keys": "^s", "label": "保存"},
            ],
        }
    )
    record = await Executor(default_registry(), driver).start(flow, mode="run")
    assert record.state == ExecutionState.DONE
    assert [run.node_id for run in record.node_runs] == ["type", "save"]
    assert any(call[0] == "find_window" for call in backend.calls)
    assert ("press", ("hello",)) in backend.calls
    assert ("press", ("^s",)) in backend.calls
    await driver.terminate(pid)


@pytest.mark.asyncio
async def test_mock_driver_launch_registers_notepad_window() -> None:
    from lanius_engine.drivers.mock import MockDriver

    driver = MockDriver()
    pid = await driver.launch("notepad.exe")
    handle = await driver.find_window({"exe": "notepad.exe"})
    assert handle in driver.windows
    await driver.element_click({"name": "Edit"})
    await driver.terminate(pid)
    assert pid not in driver.processes
