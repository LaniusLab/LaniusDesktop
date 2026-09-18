"""流程 schema 单向迁移链。只增不改（docs/FLOW-FORMAT.md §5）。"""

from lanius_engine.models.error import LaniusError
from lanius_engine.models.flow import CURRENT_SCHEMA_VERSION, FlowFile, FlowStep
from lanius_engine.runtime.order import topo_order


def migrate_to_current(flow: FlowFile) -> FlowFile:
    if flow.schema_version > CURRENT_SCHEMA_VERSION:
        raise LaniusError.of(
            "engine.flow.unsupportedSchema",
            f"流程 schemaVersion {flow.schema_version} 高于引擎支持的 {CURRENT_SCHEMA_VERSION}",
            details={"schemaVersion": flow.schema_version, "supported": CURRENT_SCHEMA_VERSION},
        )
    current = flow
    if current.schema_version < 1:
        raise LaniusError.of(
            "engine.flow.unsupportedSchema",
            f"非法 schemaVersion: {current.schema_version}",
        )
    if current.schema_version == 1:
        current = _migrate_v1_to_v2(current)
    return current


def _migrate_v1_to_v2(flow: FlowFile) -> FlowFile:
    # 已带 steps 的过渡文件只升版本，避免把 DAG 再拼一遍
    if flow.steps:
        return flow.model_copy(update={"schema_version": 2, "nodes": [], "edges": []})
    order = topo_order(flow)
    steps = [
        FlowStep(
            id=node.id,
            kind="preset",
            type=node.type,
            label=node.label,
            config=node.config,
            disabled=node.disabled,
        )
        for node in order
    ]
    return flow.model_copy(update={"schema_version": 2, "steps": steps, "nodes": [], "edges": []})
