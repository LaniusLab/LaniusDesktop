"""core.log：输出一条结构化日志。无副作用，dry-run 照常执行。"""

from typing import ClassVar

from lanius_engine.nodes.base import NodeContext, NodeResult, Port
from lanius_engine.runtime.scope import interpolate


class LogNode:
    type: ClassVar[str] = "core.log"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        message = interpolate(str(ctx.config.get("message", "")), ctx.scope)
        level = str(ctx.config.get("level", "info"))
        log = ctx.logger.bind(nodeId=ctx.node_id)
        getattr(log, level if level in ("debug", "info", "warning", "error") else "info")(
            "node.log", message=message
        )
        ctx.emit("execution.log", {"nodeId": ctx.node_id, "level": level, "message": message})
        return NodeResult()
