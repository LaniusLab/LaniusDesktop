"""keyboard.type：向已绑定窗口输入一段文本（含换行）。"""

import builtins
from typing import ClassVar

from pydantic import BaseModel

from lanius_engine.models import LaniusError
from lanius_engine.nodes.base import NodeContext, NodeResult, Port
from lanius_engine.runtime.scope import interpolate


class TypeConfig(BaseModel):
    text: str = ""


class TypeTextNode:
    type: ClassVar[str] = "keyboard.type"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = True
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}
    config_schema: ClassVar[builtins.type[BaseModel]] = TypeConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        text = interpolate(str(ctx.config.get("text", "")), ctx.scope)
        if text == "":
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "keyboard.type 缺少 text",
                node_id=ctx.node_id,
            )
        await ctx.driver.type_text(text)
        return NodeResult(outputs={"length": len(text)})
