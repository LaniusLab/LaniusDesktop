"""schemaVersion 单向迁移。"""

from lanius_engine.models import CURRENT_SCHEMA_VERSION, FlowFile, LaniusError, migrate_to_current
from lanius_engine.models.migrate import migrate_to_current as migrate


def test_v1_nodes_become_ordered_preset_steps() -> None:
    flow = FlowFile.model_validate(
        {
            "schemaVersion": 1,
            "id": "legacy",
            "name": "旧图",
            "nodes": [
                {"id": "a", "type": "core.log", "label": "甲", "config": {"message": "a"}},
                {"id": "b", "type": "core.wait", "config": {"ms": 10}},
            ],
            "edges": [{"id": "e1", "from": "a", "to": "b", "kind": "control"}],
        }
    )
    migrated = migrate(flow)
    assert migrated.schema_version == CURRENT_SCHEMA_VERSION
    assert [step.id for step in migrated.steps] == ["a", "b"]
    assert migrated.steps[0].kind == "preset"
    assert migrated.steps[0].type == "core.log"
    assert migrated.steps[0].config["message"] == "a"
    assert migrated.nodes == []
    assert migrated.edges == []


def test_cycle_fails_during_migration() -> None:
    flow = FlowFile.model_validate(
        {
            "schemaVersion": 1,
            "id": "loop",
            "name": "环",
            "nodes": [
                {"id": "a", "type": "core.log"},
                {"id": "b", "type": "core.log"},
            ],
            "edges": [
                {"id": "e1", "from": "a", "to": "b", "kind": "control"},
                {"id": "e2", "from": "b", "to": "a", "kind": "control"},
            ],
        }
    )
    try:
        migrate_to_current(flow)
        raise AssertionError("环应在迁移期失败")
    except LaniusError as err:
        assert err.error.code == "engine.flow.cycleDetected"
