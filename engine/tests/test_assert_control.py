"""core.assert + flow.wait / subflow / tryCatch。"""

from lanius_engine.drivers.mock import MockDriver
from lanius_engine.models import FlowFile
from lanius_engine.nodes.registry import default_registry
from lanius_engine.runtime.executor import Executor
from lanius_engine.runtime.state import ExecutionState


def make_template(steps: list[dict], **overrides) -> FlowFile:
    raw = {
        "schemaVersion": 3,
        "id": "ctrl-flow",
        "name": "控制流",
        "steps": steps,
        "variables": {"flag": {"type": "string", "default": "yes"}},
        **overrides,
    }
    return FlowFile.model_validate(raw)


async def test_assert_passes_and_fails() -> None:
    executor = Executor(default_registry(), MockDriver())
    ok = make_template(
        [
            {
                "id": "a",
                "kind": "preset",
                "type": "core.assert",
                "config": {"when": "equals", "source": "{{flag}}", "expected": "yes"},
            }
        ]
    )
    record = await executor.start(ok, mode="dryRun")
    assert record.state == ExecutionState.DONE

    bad = make_template(
        [
            {
                "id": "a",
                "kind": "preset",
                "type": "core.assert",
                "config": {"when": "equals", "source": "{{flag}}", "expected": "no"},
            }
        ]
    )
    failed = await executor.start(bad, mode="dryRun")
    assert failed.state == ExecutionState.FAILED
    assert failed.error is not None
    assert failed.error["code"] == "engine.runtime.assertFailed"


async def test_flow_wait_and_subflow() -> None:
    executor = Executor(default_registry(), MockDriver())
    flow = make_template(
        [
            {
                "id": "wait",
                "kind": "control",
                "type": "flow.wait",
                "config": {"ms": 30},
            },
            {
                "id": "sub",
                "kind": "control",
                "type": "flow.subflow",
                "config": {"name": "inner"},
                "body": [
                    {
                        "id": "log",
                        "kind": "preset",
                        "type": "core.log",
                        "config": {"message": "inside"},
                    }
                ],
            },
        ]
    )
    messages: list[str] = []
    record = await executor.start(
        flow,
        mode="dryRun",
        on_event=lambda e, p: messages.append(p["message"])
        if e == "execution.log"
        else None,
    )
    assert record.state == ExecutionState.DONE
    assert any("wait" in m for m in messages)
    assert any("subflow" in m for m in messages)
    assert "inside" in messages


async def test_try_catch_recovers() -> None:
    executor = Executor(default_registry(), MockDriver())
    flow = make_template(
        [
            {
                "id": "tc",
                "kind": "control",
                "type": "flow.tryCatch",
                "body": [
                    {
                        "id": "boom",
                        "kind": "preset",
                        "type": "core.assert",
                        "config": {
                            "when": "equals",
                            "source": "x",
                            "expected": "y",
                            "message": "boom",
                        },
                    }
                ],
                "catch": [
                    {
                        "id": "recover",
                        "kind": "preset",
                        "type": "core.log",
                        "config": {"message": "caught {{error.code}}"},
                    }
                ],
            }
        ]
    )
    messages: list[str] = []
    record = await executor.start(
        flow,
        mode="dryRun",
        on_event=lambda e, p: messages.append(p["message"])
        if e == "execution.log"
        else None,
    )
    assert record.state == ExecutionState.DONE
    assert any("caught engine.runtime.assertFailed" in m for m in messages)
