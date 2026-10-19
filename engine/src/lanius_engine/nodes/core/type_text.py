"""keyboard.type：向已绑定窗口输入一段文本（含换行）。

支持明文、模板插值，以及 secret:// / { secretRef }（SECURITY.md §3）。
"""

import builtins
from typing import Any, ClassVar

from pydantic import BaseModel, Field

from lanius_engine.models import LaniusError
from lanius_engine.nodes.base import NodeContext, NodeResult, Port


class TypeConfig(BaseModel):
    # str | { secretRef }；校验宽松，运行期由 resolve_value 解析
    text: Any = Field(default="")


class TypeTextNode:
    type: ClassVar[str] = "keyboard.type"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = True
    danger_level: ClassVar[str] = 'caution'
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {
        "length": Port(type="number"),
    }
    config_schema: ClassVar[builtins.type[BaseModel]] = TypeConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        resolved = ctx.resolve_value(ctx.config.get("text", ""))
        text = "" if resolved is None else str(resolved)
        if text == "":
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "keyboard.type 缺少 text",
                node_id=ctx.node_id,
            )
        await ctx.driver.type_text(text)
        return NodeResult(outputs={"length": len(text)})
