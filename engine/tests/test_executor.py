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
    assert methods == ["find_window", "activate", "set_locate", "press", "click"]
    assert driver.calls[0].args[0]["exe"] == "client.exe"
    assert driver.bound_handle == "hwnd-mock"
    assert driver.locate is not None
    assert driver.locate["channel"] == "vision"
    assert driver.calls[3].args[0] == "Enter"
    assert driver.calls[4].args[:2] == (12, 34)


async def test_disabled_steps_are_skipped() -> None:
    flow = make_template(
        steps=[
            {"id": "key", "kind": "binding", "keys": "Enter", "disabled": True, "label": "回车"},
            {"id": "log", "kind": "preset", "type": "core.log", "config": {"message": "x"}},
        ]
    )
    record = await make_executor().start(flow, mode="dryRun")
    assert record.state == ExecutionState.DONE
    assert [run.status for run in record.node_runs] == ["skipped", "done"]


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


async def test_notepad_multiline_types_text_on_bound_window() -> None:
    driver = MockDriver()
    executor = Executor(default_registry(), driver)
    flow = make_template(
        steps=[
            {"id": "wait_focus", "kind": "preset", "type": "core.wait", "config": {"ms": 1}},
            {
                "id": "type_body",
                "kind": "preset",
                "type": "keyboard.type",
                "label": "输入多行文本",
                "config": {"text": "Lanius 记事本测试\n第二行：自动化写入\n第三行：结束。"},
            },
            {
                "id": "log_done",
                "kind": "preset",
                "type": "core.log",
                "config": {"message": "多行文本已写入记事本"},
            },
        ],
        target={
            "match": {"exe": "notepad.exe", "title": "无标题 - 记事本", "className": "Notepad"},
            "locate": {"channel": "a11y", "source": "probe"},
        },
    )
    record = await executor.start(flow, mode="dryRun")
    assert record.state == ExecutionState.DONE
    methods = [call.method for call in driver.calls]
    assert "type_text" in methods
    typed = next(call.args[0] for call in driver.calls if call.method == "type_text")
    assert "第二行：自动化写入" in typed
    assert "\n" in typed


async def test_v3_if_and_loop_nesting() -> None:
    flow = FlowFile.model_validate(
        {
            "schemaVersion": 3,
            "id": "ctrl",
            "name": "控制流",
            "steps": [
                {
                    "id": "ocr",
                    "kind": "preset",
                    "type": "vision.ocr",
                    "config": {"fakeText": "确认"},
                },
                {
                    "id": "branch",
                    "kind": "control",
                    "type": "flow.if",
                    "label": "若确认",
                    "config": {"when": "ocr.contains", "text": "确认", "source": "{{ocr.text}}"},
                    "then": [
                        {
                            "id": "loop",
                            "kind": "control",
                            "type": "flow.loop",
                            "config": {"max": 2},
                            "body": [
                                {
                                    "id": "log_ok",
                                    "kind": "preset",
                                    "type": "core.log",
                                    "config": {"message": "ok-{{index}}"},
                                }
                            ],
                        }
                    ],
                    "else": [
                        {
                            "id": "log_no",
                            "kind": "preset",
                            "type": "core.log",
                            "config": {"message": "no"},
                        }
                    ],
                },
            ],
        }
    )
    messages: list[str] = []
    record = await make_executor().start(
        flow,
        mode="dryRun",
        on_event=lambda e, p: messages.append(p["message"]) if e == "execution.log" else None,
    )
    assert record.state == ExecutionState.DONE
    assert any("ok-0" in m for m in messages)
    assert any("ok-1" in m for m in messages)
    assert not any(m == "no" for m in messages)
