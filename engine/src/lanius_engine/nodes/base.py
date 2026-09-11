"""节点协议（docs/ENGINE.md §4.1）。

节点通过 NodeContext 拿一切外部能力（driver/作用域/日志/取消），
禁止自行 import driver 单例或读写全局状态。
"""

import asyncio
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, ClassVar, Protocol, runtime_checkable

import structlog

from lanius_engine.drivers.base import Driver
from lanius_engine.runtime.scope import ScopeChain


@dataclass(frozen=True)
class Port:
    type: str  # string | number | boolean | handle | any
    required: bool = False
    default: Any = None


@dataclass
class NodeContext:
    driver: Driver
    scope: ScopeChain
    logger: structlog.stdlib.BoundLogger
    cancel_event: asyncio.Event
    node_id: str
    config: dict[str, Any]
    inputs: dict[str, Any]
    emit: Callable[[str, dict[str, Any]], None] = field(default=lambda _e, _p: None)

    def check_cancelled(self) -> None:
        """安全点：driver 调用前后与循环迭代边界必须调用。"""
        if self.cancel_event.is_set():
            from lanius_engine.runtime.cancel import FlowCancelled

            raise FlowCancelled()


@dataclass
class NodeResult:
    outputs: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class Node(Protocol):
    type: ClassVar[str]
    version: ClassVar[int]
    side_effect: ClassVar[bool]
    inputs: ClassVar[dict[str, Port]]
    outputs: ClassVar[dict[str, Port]]

    async def execute(self, ctx: NodeContext) -> NodeResult: ...
