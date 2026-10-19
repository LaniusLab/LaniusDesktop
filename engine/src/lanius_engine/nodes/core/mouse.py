"""鼠标预设：单击 / 双击 / 移动。坐标默认客户区原点，识图 box 绑定属后续。"""

import builtins
from typing import ClassVar

from pydantic import BaseModel

from lanius_engine.nodes.base import NodeContext, NodeResult, Port


def _coords(ctx: NodeContext) -> tuple[int, int, str]:
    x = int(ctx.config.get("x", 0))
    y = int(ctx.config.get("y", 0))
    button = str(ctx.config.get("button", "left"))
    return x, y, button


class ClickConfig(BaseModel):
    x: int = 0
    y: int = 0
    button: str = "left"


class MoveConfig(BaseModel):
    x: int = 0
    y: int = 0


class ClickNode:
    type: ClassVar[str] = "mouse.click"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = True
    danger_level: ClassVar[str] = 'caution'
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}
    config_schema: ClassVar[builtins.type[BaseModel]] = ClickConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        x, y, button = _coords(ctx)
        await ctx.driver.click(x, y, button=button)
        return NodeResult()


class DblClickNode:
    type: ClassVar[str] = "mouse.dblclick"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = True
    danger_level: ClassVar[str] = 'caution'
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}
    config_schema: ClassVar[builtins.type[BaseModel]] = ClickConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        x, y, button = _coords(ctx)
        await ctx.driver.click(x, y, button=button)
        ctx.check_cancelled()
        await ctx.driver.click(x, y, button=button)
        return NodeResult()


class MoveNode:
    type: ClassVar[str] = "mouse.move"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = True
    danger_level: ClassVar[str] = 'caution'
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}
    config_schema: ClassVar[builtins.type[BaseModel]] = MoveConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        x, y, _button = _coords(ctx)
        await ctx.driver.move(x, y)
        return NodeResult()
