"""data.setVar / data.template 节点。"""

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
        "variables": {"who": {"type": "string", "default": "世界"}},
        "steps": steps,
        **overrides,
    }
    return FlowFile.model_validate(raw)


async def test_set_var_and_template_render() -> None:
    executor = Executor(default_registry(), MockDriver())
    flow = make_template(
        steps=[
            {
                "id": "set",
                "kind": "preset",
                "type": "data.setVar",
                "config": {"name": "who", "value": "Lanius"},
            },
            {
                "id": "tpl",
                "kind": "preset",
                "type": "data.template",
                "config": {"template": "你好，{{ who }}！", "as": "greeting"},
            },
            {
                "id": "log",
                "kind": "preset",
                "type": "core.log",
                "config": {"message": "{{ greeting }}"},
            },
        ]
    )
    events: list[tuple[str, dict]] = []
    record = await executor.start(
        flow,
        mode="dryRun",
        on_event=lambda e, p: events.append((e, p)),
    )
    assert record.state == ExecutionState.DONE
    messages = [p["message"] for e, p in events if e == "execution.log"]
    assert "你好，Lanius！" in messages
