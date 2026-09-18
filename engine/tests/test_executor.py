"""执行器测试：状态机轨迹、取消、超时、互斥（全部基于 mock driver，无需显示器）。"""

import asyncio

from lanius_engine.drivers.mock import MockDriver
from lanius_engine.models import FlowFile, LaniusError
from lanius_engine.nodes.registry import default_registry
from lanius_engine.runtime.executor import Executor
from lanius_engine.runtime.state import ExecutionState, ExecutionStateMachine


def make_flow(
    nodes: list[dict] | None = None, edges: list[dict] | None = None, **overrides
) -> FlowFile:
    raw = {
        "schemaVersion": 1,
        "id": "test-flow",
        "name": "测试流程",
        "nodes": nodes or [],
        "edges": edges or [],
        **overrides,
    }
    return FlowFile.model_validate(raw)


def make_template(steps: list[dict], **overrides) -> FlowFile:
    raw = {
        "schemaVersion": 2,
        "id": "test-template",
        "name": "测试模板",
        "steps": steps,
        **overrides,
    }
    return FlowFile.model_validate(raw)


def make_executor() -> Executor:
    return Executor(default_registry(), MockDriver())


async def test_v2_steps_run_key_and_mouse_on_bound_window() -> None:
    driver = MockDriver()
    executor = Executor(default_registry(), driver)
    flow = make_template(
        steps=[
            {
                "id": "key",
                "kind": "binding",
                "keys": "Enter",
                "label": "回车",
            },
            {
                "id": "click",
                "kind": "mouse",
                "type": "mouse.click",
                "config": {"x": 12, "y": 34, "button": "left"},
            },
        ],
        target={"match": {"exe": "client.exe"}, "locate": {"channel": "vision", "source": "user"}},
    )
    record = await executor.start(flow, mode="dryRun")
    assert record.state == ExecutionState.DONE
    assert [run.node_id for run in record.node_runs] == ["key", "click"]
    methods = [call.method for call in driver.calls]
    assert methods == ["find_window", "press", "click"]
    assert driver.calls[0].args[0]["exe"] == "client.exe"
    assert driver.calls[1].args[0] == "Enter"
    assert driver.calls[2].args[:2] == (12, 34)


async def test_binding_without_keys_fails() -> None:
    flow = make_template([{"id": "key", "kind": "binding", "label": "空键"}])
    record = await make_executor().start(flow, mode="dryRun")
    assert record.state == ExecutionState.FAILED
    assert record.error is not None
    assert record.error["code"] == "engine.flow.validationFailed"


async def test_v1_graph_still_migrates_and_runs() -> None:
    flow = make_flow(
        nodes=[
            {"id": "a", "type": "core.log", "config": {"message": "第一步"}},
            {"id": "b", "type": "core.log", "config": {"message": "第二步"}},
        ],
        edges=[{"id": "e1", "from": "a", "to": "b", "kind": "control"}],
    )
    events: list[tuple[str, dict]] = []
    record = await make_executor().start(
        flow, mode="dryRun", on_event=lambda e, p: events.append((e, p))
    )
    assert record.state == ExecutionState.DONE
    assert [run.node_id for run in record.node_runs] == ["a", "b"]
    state_events = [p["to"] for e, p in events if e == "execution.stateChanged"]
    assert state_events == ["validating", "running", "done"]


async def test_template_interpolation_uses_flow_variables() -> None:
    flow = make_flow(
        nodes=[{"id": "a", "type": "core.log", "config": {"message": "你好，{{ who }}"}}],
        variables={"who": {"type": "string", "default": "Lanius"}},
    )
    messages: list[str] = []
    record = await make_executor().start(
        flow,
        mode="dryRun",
        on_event=lambda e, p: messages.append(p["message"])
        if e == "execution.log"
        else None,
    )
    assert record.state == ExecutionState.DONE
    assert messages == ["你好，Lanius"]


async def test_undefined_variable_fails_loudly() -> None:
    flow = make_flow(
        nodes=[{"id": "a", "type": "core.log", "config": {"message": "{{ missing }}"}}],
    )
    record = await make_executor().start(flow, mode="dryRun")
    assert record.state == ExecutionState.FAILED
    assert record.error is not None
    assert record.error["code"] == "engine.runtime.variableNotFound"


async def test_cycle_is_rejected() -> None:
    flow = make_flow(
        nodes=[
            {"id": "a", "type": "core.log", "config": {}},
            {"id": "b", "type": "core.log", "config": {}},
        ],
        edges=[
            {"id": "e1", "from": "a", "to": "b", "kind": "control"},
            {"id": "e2", "from": "b", "to": "a", "kind": "control"},
        ],
    )
    record = await make_executor().start(flow, mode="dryRun")
    assert record.state == ExecutionState.FAILED
    assert record.error is not None
    assert record.error["code"] == "engine.flow.cycleDetected"


async def test_busy_lock_rejects_concurrent_start() -> None:
    flow = make_flow(nodes=[{"id": "a", "type": "core.wait", "config": {"ms": 300}}])
    executor = make_executor()
    first = asyncio.create_task(executor.start(flow, mode="dryRun"))
    await asyncio.sleep(0.05)
    try:
        await executor.start(flow, mode="dryRun")
        raise AssertionError("并发启动应被拒绝")
    except LaniusError as err:
        assert err.error.code == "engine.runtime.busy"
    await first


async def test_cancel_stops_execution_at_safe_point() -> None:
    flow = make_flow(nodes=[{"id": "a", "type": "core.wait", "config": {"ms": 60_000}}])
    executor = make_executor()
    task = asyncio.create_task(executor.start(flow, mode="dryRun"))
    await asyncio.sleep(0.1)
    executor.cancel()
    record = await asyncio.wait_for(task, timeout=5)
    assert record.state == ExecutionState.CANCELLED


async def test_node_timeout_maps_to_error_model() -> None:
    flow = make_flow(
        nodes=[{"id": "a", "type": "core.wait", "config": {"ms": 60_000, "timeoutMs": 100}}],
    )
    record = await make_executor().start(flow, mode="dryRun")
    assert record.state == ExecutionState.FAILED
    assert record.error is not None
    assert record.error["code"] == "engine.runtime.timeout"


def test_state_machine_rejects_illegal_transition() -> None:
    machine = ExecutionStateMachine()
    try:
        machine.transition(ExecutionState.RUNNING)
        raise AssertionError("idle → running 应被拒绝")
    except LaniusError as err:
        assert err.error.code == "engine.runtime.illegalTransition"
