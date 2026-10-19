"""fs.readText / fs.writeText / fs.exists。"""

from pathlib import Path

from lanius_engine.drivers.mock import MockDriver
from lanius_engine.models import FlowFile
from lanius_engine.nodes.registry import default_registry
from lanius_engine.runtime.executor import Executor
from lanius_engine.runtime.state import ExecutionState


def make_template(steps: list[dict]) -> FlowFile:
    return FlowFile.model_validate(
        {
            "schemaVersion": 2,
            "id": "fs-flow",
            "name": "文件系统",
            "steps": steps,
        }
    )


async def test_write_read_exists_roundtrip(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("LANIUS_FS_ROOT", str(tmp_path))
    executor = Executor(default_registry(), MockDriver())
    flow = make_template(
        [
            {
                "id": "w",
                "kind": "preset",
                "type": "fs.writeText",
                "config": {"path": "note.txt", "content": "hello"},
            },
            {
                "id": "e",
                "kind": "preset",
                "type": "fs.exists",
                "config": {"path": "note.txt"},
            },
            {
                "id": "r",
                "kind": "preset",
                "type": "fs.readText",
                "config": {"path": "note.txt"},
            },
            {
                "id": "log",
                "kind": "preset",
                "type": "core.log",
                "config": {"message": "{{r.outputs.text}}"},
            },
        ]
    )
    messages: list[str] = []
    record = await executor.start(
        flow,
        mode="run",
        on_event=lambda e, p: messages.append(p["message"])
        if e == "execution.log" and p.get("nodeId") == "log"
        else None,
    )
    assert record.state == ExecutionState.DONE
    assert (tmp_path / "note.txt").read_text(encoding="utf-8") == "hello"
    assert messages == ["hello"]


async def test_path_escape_denied(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("LANIUS_FS_ROOT", str(tmp_path))
    executor = Executor(default_registry(), MockDriver())
    flow = make_template(
        [
            {
                "id": "w",
                "kind": "preset",
                "type": "fs.writeText",
                "config": {"path": "../outside.txt", "content": "x"},
            }
        ]
    )
    record = await executor.start(flow, mode="run")
    assert record.state == ExecutionState.FAILED
    assert record.error is not None
    assert record.error["code"] == "engine.io.pathDenied"
