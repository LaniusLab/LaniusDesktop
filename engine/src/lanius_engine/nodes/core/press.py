"""keyboard.press：向已绑定窗口发送按键或组合（步骤 kind=binding 的执行面）。"""

import builtins
from typing import ClassVar

from pydantic import BaseModel

from lanius_engine.models import LaniusError
from lanius_engine.nodes.base import NodeContext, NodeResult, Port


class PressConfig(BaseModel):
    keys: str = ""


class PressNode:
    type: ClassVar[str] = "keyboard.press"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = True
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}
    config_schema: ClassVar[builtins.type[BaseModel]] = PressConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        keys = str(ctx.config.get("keys", "")).strip()
        if not keys:
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "keyboard.press 缺少 keys",
                node_id=ctx.node_id,
            )
        await ctx.driver.press(keys)
        return NodeResult()
