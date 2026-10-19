"""节点协议（docs/ENGINE.md §4.1）。

节点通过 NodeContext 拿一切外部能力（driver/作用域/日志/取消），
禁止自行 import driver 单例或读写全局状态。
"""

from __future__ import annotations

import asyncio
import builtins
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any, ClassVar, Protocol, runtime_checkable

import structlog
from pydantic import BaseModel

from lanius_engine.drivers.base import Driver
from lanius_engine.runtime.scope import ScopeChain
from lanius_engine.runtime.secrets import (
    SecretProvider,
    create_secret_provider,
    resolve_config_value,
)

PauseCheckpoint = Callable[[], Awaitable[None]]


@dataclass(frozen=True)
class Port:
    type: str  # string | number | boolean | handle | any
    required: bool = False
    default: Any = None
    # True：端口值不进历史摘要 / 日志明文（SECURITY.md §3）
    sensitive: bool = False


async def _noop_pause() -> None:
    return None


@dataclass
class NodeContext:
    driver: Driver
    scope: ScopeChain
    logger: structlog.stdlib.BoundLogger
    cancel_event: asyncio.Event
    node_id: str
    config: dict[str, Any]
    inputs: dict[str, Any]
    # 节点剩余超时预算（毫秒）：min(节点 timeoutMs, 流程剩余)；长等待必须尊重它
    timeout_ms: int = 30_000
    emit: Callable[[str, dict[str, Any]], None] = field(default=lambda _e, _p: None)
    # 长等待循环内调用：若已 pause 则挂起至 resume / cancel
    await_pause: PauseCheckpoint = field(default=_noop_pause)
    secrets: SecretProvider = field(default_factory=create_secret_provider)

    def check_cancelled(self) -> None:
        """安全点：driver 调用前后与循环迭代边界必须调用。"""
        if self.cancel_event.is_set():
            from lanius_engine.runtime.cancel import FlowCancelled

            raise FlowCancelled()

    async def checkpoint(self) -> None:
        """安全点：检查取消 + 协作式暂停。"""
        self.check_cancelled()
        await self.await_pause()

    def resolve_value(self, raw: Any, *, interpolate: bool = True) -> Any:
        """解析配置值中的 secretRef / secret://；可选模板插值。"""
        from lanius_engine.runtime.scope import interpolate as interpolate_text

        return resolve_config_value(
            raw,
            self.secrets,
            interpolate_fn=(
                (lambda text: interpolate_text(text, self.scope)) if interpolate else None
            ),
            node_id=self.node_id,
        )


@dataclass
class NodeResult:
    outputs: dict[str, Any] = field(default_factory=dict)
    # flow.if / 类似控制节点选出的命名出口；None 表示跟随所有无 branch 的 control 边
    branch: str | None = None


@runtime_checkable
class Node(Protocol):
    type: ClassVar[str]
    version: ClassVar[int]
    side_effect: ClassVar[bool]
    inputs: ClassVar[dict[str, Port]]
    outputs: ClassVar[dict[str, Port]]
    # Protocol 有名为 type 的成员；用 builtins.type 避免 mypy 当成属性引用
    config_schema: ClassVar[builtins.type[BaseModel]]

    async def execute(self, ctx: NodeContext) -> NodeResult: ...
