"""core.assert：断言条件成立，否则以 engine.runtime.assertFailed 失败。"""

from __future__ import annotations

import builtins
from typing import ClassVar, Literal

from pydantic import BaseModel

from lanius_engine.models import LaniusError
from lanius_engine.nodes.base import NodeContext, NodeResult, Port
from lanius_engine.runtime.scope import interpolate


class AssertConfig(BaseModel):
    # equals | contains | truthy
    when: Literal["equals", "contains", "truthy"] = "truthy"
    source: str = ""
    expected: str = ""
    message: str = ""


class AssertNode:
    type: ClassVar[str] = "core.assert"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}
    config_schema: ClassVar[builtins.type[BaseModel]] = AssertConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        await ctx.checkpoint()
        when = str(ctx.config.get("when", "truthy"))
        source_expr = str(ctx.config.get("source", ""))
        expected = interpolate(str(ctx.config.get("expected", "")), ctx.scope)
        actual = (
            interpolate(source_expr, ctx.scope)
            if "{{" in source_expr
            else source_expr
        )
        ok = False
        if when == "equals":
            ok = actual == expected
        elif when == "contains":
            ok = expected in actual
        else:
            ok = bool(actual.strip() if isinstance(actual, str) else actual)

        if not ok:
            msg = str(ctx.config.get("message", "")).strip() or (
                f"断言失败（{when}）：actual={actual!r} expected={expected!r}"
            )
            raise LaniusError.of(
                "engine.runtime.assertFailed",
                msg,
                node_id=ctx.node_id,
                details={"when": when, "actual": actual, "expected": expected},
            )
        ctx.emit(
            "execution.log",
            {
                "nodeId": ctx.node_id,
                "level": "debug",
                "message": f"assert ok ({when})",
            },
        )
        return NodeResult()
