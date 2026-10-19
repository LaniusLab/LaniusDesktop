"""识图节点（M0/M1 mock）：OCR 读字与等到画面出现。真后端随识图里程碑替换。"""

import builtins
from typing import ClassVar

from pydantic import BaseModel, Field

from lanius_engine.nodes.base import NodeContext, NodeResult, Port
from lanius_engine.runtime.scope import interpolate


class OcrConfig(BaseModel):
    # mock 用：固定返回文案；真 OCR 忽略此字段
    fakeText: str = "确认"
    region: str = "client"


class WaitImageConfig(BaseModel):
    text: str = ""
    template: str = ""
    timeoutMs: int = Field(default=8000, ge=1)
    fakeText: str = ""


class OcrNode:
    type: ClassVar[str] = "vision.ocr"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}
    config_schema: ClassVar[builtins.type[BaseModel]] = OcrConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        text = interpolate(str(ctx.config.get("fakeText", "确认")), ctx.scope)
        box = {"x": 120, "y": 84, "w": 64, "h": 24}
        ctx.emit(
            "execution.log",
            {"nodeId": ctx.node_id, "level": "info", "message": f"OCR（mock）：{text}"},
        )
        return NodeResult(outputs={"text": text, "boxes": [box], "box": box})


class WaitImageNode:
    type: ClassVar[str] = "vision.wait"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {}
    config_schema: ClassVar[builtins.type[BaseModel]] = WaitImageConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        ctx.check_cancelled()
        needle = interpolate(
            str(ctx.config.get("text") or ctx.config.get("fakeText") or "下一步"),
            ctx.scope,
        )
        box = {"x": 160, "y": 120, "w": 80, "h": 28}
        ctx.emit(
            "execution.log",
            {
                "nodeId": ctx.node_id,
                "level": "info",
                "message": f"等到画面（mock）：{needle}",
            },
        )
        return NodeResult(outputs={"text": needle, "box": box, "found": True})
