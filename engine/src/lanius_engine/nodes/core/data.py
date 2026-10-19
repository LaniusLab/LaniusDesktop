"""数据节点：变量写入与模板插值（docs/ENGINE.md §4.3 / §5.5）。

- data.setVar：把插值后的值写入流程全局作用域（支持 secretRef）
- data.template：插值模板字符串，作为 outputs.value；可选 as 写回全局
"""

import builtins
from typing import Any, ClassVar

from pydantic import BaseModel, Field

from lanius_engine.models import LaniusError
from lanius_engine.nodes.base import NodeContext, NodeResult, Port
from lanius_engine.runtime.scope import interpolate
from lanius_engine.runtime.secrets import REDACTED, is_secret_ref


class SetVarConfig(BaseModel):
    name: str = ""
    value: Any = ""


class TemplateConfig(BaseModel):
    template: str = ""
    # 可选：插值结果写回流程全局变量名
    as_: str = Field(default="", alias="as")

    model_config = {"populate_by_name": True}


class SetVarNode:
    type: ClassVar[str] = "data.setVar"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {"value": Port(type="any")}
    config_schema: ClassVar[builtins.type[BaseModel]] = SetVarConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        name = str(ctx.config.get("name", "")).strip()
        if not name:
            raise LaniusError.of(
                "engine.flow.validationFailed",
                f"节点 {ctx.node_id} 缺少变量名 name",
                node_id=ctx.node_id,
                details={"missing": ["name"]},
            )
        if not name.isidentifier() or "." in name:
            raise LaniusError.of(
                "engine.flow.validationFailed",
                f"非法变量名: {name}",
                node_id=ctx.node_id,
                details={"name": name},
            )
        raw = ctx.config.get("value", "")
        sensitive = is_secret_ref(raw)
        value = ctx.resolve_value(raw)
        ctx.scope.set_global(name, value)
        shown = REDACTED if sensitive else repr(value)
        ctx.emit(
            "execution.log",
            {
                "nodeId": ctx.node_id,
                "level": "debug",
                "message": f"setVar {name}={shown}",
            },
        )
        return NodeResult(outputs={"value": value})


class TemplateNode:
    type: ClassVar[str] = "data.template"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {"value": Port(type="string")}
    config_schema: ClassVar[builtins.type[BaseModel]] = TemplateConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        template = str(ctx.config.get("template", ""))
        rendered = interpolate(template, ctx.scope)
        as_name = str(ctx.config.get("as", "")).strip()
        if as_name:
            if not as_name.isidentifier() or "." in as_name:
                raise LaniusError.of(
                    "engine.flow.validationFailed",
                    f"非法变量名: {as_name}",
                    node_id=ctx.node_id,
                    details={"name": as_name},
                )
            ctx.scope.set_global(as_name, rendered)
        return NodeResult(outputs={"value": rendered})
