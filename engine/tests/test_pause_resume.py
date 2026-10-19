"""flow.pause / flow.resume 协作式暂停。"""

import asyncio

from lanius_engine.drivers.mock import MockDriver
from lanius_engine.models import FlowFile, LaniusError
from lanius_engine.nodes.registry import default_registry
from lanius_engine.runtime.executor import Executor
from lanius_engine.runtime.state import ExecutionState


def make_template(steps: list[dict]) -> FlowFile:
    return FlowFile.model_validate(
        {
            "schemaVersion": 2,
            "id": "pause-flow",
            "name": "暂停测试",
            "steps": steps,
        }
    )


async def test_pause_and_resume_between_steps() -> None:
    executor = Executor(default_registry(), MockDriver())
    flow = make_template(
        [
            {"id": "w1", "kind": "preset", "type": "core.wait", "config": {"ms": 200}},
            {"id": "w2", "kind": "preset", "type": "core.wait", "config": {"ms": 50}},
        ]
    )
    events: list[str] = []

    def on_event(name: str, payload: dict) -> None:
        if name == "execution.stateChanged":
            events.append(payload["to"])

    task = asyncio.create_task(executor.start(flow, mode="dryRun", on_event=on_event))
    await asyncio.sleep(0.05)
    assert executor.active_execution_id is not None
    executor.pause(executor.active_execution_id)
    await asyncio.sleep(0.25)
    assert "paused" in events
    assert not task.done()
    executor.resume(executor.active_execution_id)
    record = await asyncio.wait_for(task, timeout=5)
    assert record.state == ExecutionState.DONE
    assert events.count("paused") >= 1
    assert "running" in events
    assert events[-1] == "done"


async def test_cancel_while_paused() -> None:
    executor = Executor(default_registry(), MockDriver())
    flow = make_template(
        [{"id": "w1", "kind": "preset", "type": "core.wait", "config": {"ms": 60_000}}]
    )
    task = asyncio.create_task(executor.start(flow, mode="dryRun"))
    await asyncio.sleep(0.05)
    eid = executor.active_execution_id
    assert eid is not None
    executor.pause(eid)
    await asyncio.sleep(0.1)
    executor.cancel()
    record = await asyncio.wait_for(task, timeout=5)
    assert record.state == ExecutionState.CANCELLED


async def test_pause_without_active_run_fails() -> None:
    executor = Executor(default_registry(), MockDriver())
    try:
        executor.pause("exec-missing")
        raise AssertionError("expected notFound")
    except LaniusError as err:
        assert err.error.code == "engine.runtime.notFound"
