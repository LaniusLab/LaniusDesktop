"""core.wait：等待指定毫秒。演示协作式取消的最小节点：分段睡眠并轮询取消事件。"""

import asyncio
from typing import ClassVar

from lanius_engine.models import LaniusError
from lanius_engine.nodes.base import NodeContext, NodeResult, Port

_TICK_MS = 50


class WaitNode:
    type: ClassVar[str] = "core.wait"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}

    async def execute(self, ctx: NodeContext) -> NodeResult:
        raw = ctx.config.get("ms", 1000)
        try:
            remaining = int(raw)
        except (TypeError, ValueError):
            raise LaniusError.of(
                "engine.flow.validationFailed",
                f"core.wait 的 ms 必须是整数，收到 {raw!r}",
                node_id=ctx.node_id,
                details={"config": "ms", "received": repr(raw)},
            ) from None
        if remaining < 0:
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "core.wait 的 ms 不能为负数",
                node_id=ctx.node_id,
            )
        while remaining > 0:
            ctx.check_cancelled()
            tick = min(_TICK_MS, remaining)
            await asyncio.sleep(tick / 1000)
            remaining -= tick
        return NodeResult()
