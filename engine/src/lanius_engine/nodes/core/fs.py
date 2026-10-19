"""文件系统节点（M1 首批）：受根目录约束，禁止路径穿越。

根目录：`LANIUS_FS_ROOT` 环境变量；未设置时使用进程 cwd。
"""

from __future__ import annotations

import builtins
import os
from pathlib import Path
from typing import ClassVar

from pydantic import BaseModel

from lanius_engine.models import LaniusError
from lanius_engine.nodes.base import NodeContext, NodeResult, Port
from lanius_engine.runtime.scope import interpolate


class PathConfig(BaseModel):
    path: str = ""


class WriteConfig(BaseModel):
    path: str = ""
    content: str = ""
    append: bool = False


def fs_root() -> Path:
    raw = os.environ.get("LANIUS_FS_ROOT", "").strip()
    return Path(raw).resolve() if raw else Path.cwd().resolve()


def resolve_under_root(raw_path: str, *, node_id: str) -> Path:
    root = fs_root()
    if Path(raw_path).is_absolute():
        candidate = Path(raw_path).resolve()
    else:
        candidate = (root / raw_path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise LaniusError.of(
            "engine.io.pathDenied",
            f"路径越出授权目录: {raw_path}",
            node_id=node_id,
            details={"path": raw_path, "root": str(root)},
        ) from exc
    return candidate


class ReadTextNode:
    type: ClassVar[str] = "fs.readText"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    danger_level: ClassVar[str] = 'safe'
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {"text": Port(type="string")}
    config_schema: ClassVar[builtins.type[BaseModel]] = PathConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        await ctx.checkpoint()
        path = resolve_under_root(
            interpolate(str(ctx.config.get("path", "")), ctx.scope),
            node_id=ctx.node_id,
        )
        if not path.is_file():
            raise LaniusError.of(
                "engine.io.notFound",
                f"文件不存在: {path}",
                node_id=ctx.node_id,
                details={"path": str(path)},
            )
        text = path.read_text(encoding="utf-8")
        return NodeResult(outputs={"text": text})


class WriteTextNode:
    type: ClassVar[str] = "fs.writeText"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = True
    danger_level: ClassVar[str] = 'destructive'
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {"path": Port(type="string")}
    config_schema: ClassVar[builtins.type[BaseModel]] = WriteConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        await ctx.checkpoint()
        path = resolve_under_root(
            interpolate(str(ctx.config.get("path", "")), ctx.scope),
            node_id=ctx.node_id,
        )
        content = interpolate(str(ctx.config.get("content", "")), ctx.scope)
        append = bool(ctx.config.get("append", False))
        path.parent.mkdir(parents=True, exist_ok=True)
        if append:
            with path.open("a", encoding="utf-8") as handle:
                handle.write(content)
        else:
            path.write_text(content, encoding="utf-8")
        return NodeResult(outputs={"path": str(path)})


class ExistsNode:
    type: ClassVar[str] = "fs.exists"
    version: ClassVar[int] = 1
    side_effect: ClassVar[bool] = False
    danger_level: ClassVar[str] = 'safe'
    inputs: ClassVar[dict[str, Port]] = {}
    outputs: ClassVar[dict[str, Port]] = {"exists": Port(type="boolean")}
    config_schema: ClassVar[builtins.type[BaseModel]] = PathConfig

    async def execute(self, ctx: NodeContext) -> NodeResult:
        await ctx.checkpoint()
        path = resolve_under_root(
            interpolate(str(ctx.config.get("path", "")), ctx.scope),
            node_id=ctx.node_id,
        )
        return NodeResult(outputs={"exists": path.exists()})
