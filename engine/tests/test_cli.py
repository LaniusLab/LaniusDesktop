import json
from pathlib import Path

from lanius_engine.cli import _load_flow
from lanius_engine.models import CURRENT_SCHEMA_VERSION
from lanius_engine.nodes.registry import default_registry

ROOT = Path(__file__).resolve().parents[2]


def test_cli_loads_hello_example_steps() -> None:
    flow = _load_flow(ROOT / "examples" / "hello.flow.json")
    known = set(default_registry().types())
    assert len(flow.steps) == 5
    assert all(step.node_type() in known for step in flow.steps)
    assert flow.schema_version == CURRENT_SCHEMA_VERSION


def test_cli_loads_notepad_multiline_example() -> None:
    flow = _load_flow(ROOT / "examples" / "notepad-multiline.flow.json")
    known = set(default_registry().types())
    assert flow.schema_version == CURRENT_SCHEMA_VERSION
    assert flow.target.match.exe == "notepad.exe"
    assert [step.type for step in flow.steps] == ["core.wait", "keyboard.type", "core.log"]
    assert all(step.node_type() in known for step in flow.steps)
    typed = flow.steps[1]
    assert "\n" in str(typed.config.get("text", ""))


def test_cli_migrates_v1_graph(tmp_path: Path) -> None:
    path = tmp_path / "old.flow.json"
    path.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "id": "old",
                "name": "旧图",
                "nodes": [{"id": "a", "type": "core.log", "config": {"message": "x"}}],
                "edges": [],
            }
        ),
        encoding="utf-8",
    )
    flow = _load_flow(path)
    assert flow.schema_version == CURRENT_SCHEMA_VERSION
    assert [step.type for step in flow.steps] == ["core.log"]
