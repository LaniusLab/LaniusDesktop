"""数据节点：变量写入与模板渲染（docs/ENGINE.md §4.3 / §5.5）。"""

from __future__ import annotations

import builtins
from typing import Any, ClassVar

from pydantic import BaseModel, Field

from lanius_engine.nodes.base import NodeContext, NodeResult, Port
from lanius_engine.runtime.scope import interpolate


class SetVarConfig(BaseModel):
    name: str = Field(min_length=1)
    value: Any = ""


class SetVarNode:
    """把值写入流程全局作用域（越过循环帧）。"""

    type: ClassVar[str] = "data.setVar"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {"value": Port(type="any")}
    config_schema: ClassVar[builtins.type[BaseModel]] = SetVarConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        cfg = SetVarConfig.model_validate(ctx.config)
        value: Any = cfg.value
        if isinstance(value, str):
            value = interpolate(value, ctx.scope)
        ctx.scope.set_global(cfg.name, value)
        return NodeResult(outputs={"value": value})


class TemplateConfig(BaseModel):
    template: str = ""
    as_: str = Field(default="", alias="as")

    model_config = {"populate_by_name": True}


class TemplateNode:
    """渲染 {{ path }} 模板；可选写入全局变量名 `as`。"""

    type: ClassVar[str] = "data.template"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {"result": Port(type="string")}
    config_schema: ClassVar[builtins.type[BaseModel]] = TemplateConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        cfg = TemplateConfig.model_validate(ctx.config)
        result = interpolate(cfg.template, ctx.scope)
        if cfg.as_:
            ctx.scope.set_global(cfg.as_, result)
        return NodeResult(outputs={"result": result})
