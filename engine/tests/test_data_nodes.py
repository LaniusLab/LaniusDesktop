"""data.setVar / data.template 节点行为。"""

from lanius_engine.drivers.mock import MockDriver
from lanius_engine.models import FlowFile
from lanius_engine.nodes.registry import default_registry
from lanius_engine.runtime.executor import Executor
from lanius_engine.runtime.state import ExecutionState


def make_template(steps: list[dict], **overrides) -> FlowFile:
    raw = {
        "schemaVersion": 2,
        "id": "data-flow",
        "name": "数据节点",
        "steps": steps,
        "variables": {"greet": {"type": "string", "default": "hi"}},
        **overrides,
    }
    return FlowFile.model_validate(raw)


async def test_set_var_and_template_interpolate() -> None:
    executor = Executor(default_registry(), MockDriver())
    flow = make_template(
        [
            {
                "id": "set",
                "kind": "preset",
                "type": "data.setVar",
                "config": {"name": "who", "value": "world"},
            },
            {
                "id": "tpl",
                "kind": "preset",
                "type": "data.template",
                "config": {"template": "{{greet}} {{who}}", "as": "msg"},
            },
            {
                "id": "log",
                "kind": "preset",
                "type": "core.log",
                "config": {"message": "{{msg}}"},
            },
        ]
    )
    events: list[tuple[str, dict]] = []
    record = await executor.start(
        flow, mode="dryRun", on_event=lambda e, p: events.append((e, p))
    )
    assert record.state == ExecutionState.DONE
    assert [run.node_id for run in record.node_runs] == ["set", "tpl", "log"]
    log_events = [p for e, p in events if e == "execution.log" and p.get("nodeId") == "log"]
    assert log_events
    assert log_events[0]["message"] == "hi world"


async def test_set_var_requires_name() -> None:
    executor = Executor(default_registry(), MockDriver())
    flow = make_template(
        [{"id": "set", "kind": "preset", "type": "data.setVar", "config": {"value": "x"}}]
    )
    record = await executor.start(flow, mode="dryRun")
    assert record.state == ExecutionState.FAILED
    assert record.error is not None
    assert record.error["code"] == "engine.flow.validationFailed"


def test_hello_lists_data_nodes() -> None:
    types = default_registry().types()
    assert "data.setVar" in types
    assert "data.template" in types
