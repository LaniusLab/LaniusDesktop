import json
from pathlib import Path

from lanius_engine.cli import _load_flow
from lanius_engine.nodes.registry import default_registry

ROOT = Path(__file__).resolve().parents[2]


def test_cli_loads_v2_example_steps() -> None:
    flow = _load_flow(ROOT / "examples" / "hello.flow.json")
    known = set(default_registry().types())
    assert len(flow.steps) == 5
    assert all(step.node_type() in known for step in flow.steps)
    assert flow.schema_version == 2


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
    assert flow.schema_version == 2
    assert [step.type for step in flow.steps] == ["core.log"]
