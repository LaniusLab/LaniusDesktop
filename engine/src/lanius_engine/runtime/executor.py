"""执行器：拓扑调度 + 状态机 + 协作式取消 + 双层超时（docs/ENGINE.md §5）。

M0 范围：顺序执行 control 边定义的图；并行结构串行化与分支语义属 M1。
"""

import asyncio
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Literal

from lanius_engine.drivers.base import Driver
from lanius_engine.logging import get_logger
from lanius_engine.models import FlowFile, LaniusError
from lanius_engine.nodes.base import NodeContext
from lanius_engine.nodes.registry import NodeRegistry
from lanius_engine.runtime.cancel import FlowCancelled
from lanius_engine.runtime.scope import ScopeChain
from lanius_engine.runtime.state import ExecutionState, ExecutionStateMachine

EventHook = Callable[[str, dict[str, Any]], None]


@dataclass
class NodeRun:
    node_id: str
    status: Literal["done", "failed", "cancelled", "skipped"]
    duration_ms: int
    error_code: str | None = None


@dataclass
class ExecutionRecord:
    execution_id: str
    flow_id: str
    mode: Literal["run", "dryRun"]
    state: ExecutionState
    node_runs: list[NodeRun] = field(default_factory=list)
    error: dict[str, Any] | None = None


class Executor:
    def __init__(self, registry: NodeRegistry, driver: Driver) -> None:
        self._registry = registry
        self._driver = driver
        self._lock = asyncio.Lock()  # 键鼠全局互斥：同时只允许一个执行实例
        self._cancel: asyncio.Event | None = None

    async def start(
        self,
        flow: FlowFile,
        *,
        mode: Literal["run", "dryRun"] = "run",
        on_event: EventHook | None = None,
    ) -> ExecutionRecord:
        if self._lock.locked():
            raise LaniusError.of(
                "engine.runtime.busy",
                "已有执行实例在运行（键鼠为全局独占资源）",
                retryable=True,
            )
        async with self._lock:
            self._cancel = asyncio.Event()
            try:
                return await self._run(flow, mode=mode, on_event=on_event or (lambda _e, _p: None))
            finally:
                self._cancel = None

    def cancel(self) -> None:
        if self._cancel is not None:
            self._cancel.set()

    async def _run(
        self, flow: FlowFile, *, mode: Literal["run", "dryRun"], on_event: EventHook
    ) -> ExecutionRecord:
        assert self._cancel is not None
        cancel_event = self._cancel
        machine = ExecutionStateMachine()
        execution_id = f"exec-{uuid.uuid4().hex[:12]}"
        logger = get_logger(executionId=execution_id)

        def emit(event: str, payload: dict[str, Any]) -> None:
            on_event(event, {"executionId": execution_id, **payload})

        machine.transition(ExecutionState.VALIDATING)
        emit("execution.stateChanged", {"from": "idle", "to": "validating"})

        record = ExecutionRecord(
            execution_id=execution_id, flow_id=flow.id, mode=mode, state=ExecutionState.VALIDATING
        )

        try:
            order = _topo_order(flow)
        except LaniusError as err:
            # 校验期失败同样走状态机：validating → failed，错误进记录
            machine.transition(ExecutionState.FAILED)
            record.state = machine.state
            record.error = err.error.model_dump(mode="json")
            emit("execution.stateChanged", {"from": "validating", "to": "failed"})
            return record

        scope = ScopeChain(frames=[{name: var.default for name, var in flow.variables.items()}])

        machine.transition(ExecutionState.RUNNING)
        record.state = ExecutionState.RUNNING
        emit("execution.stateChanged", {"from": "validating", "to": "running"})

        flow_deadline = time.monotonic() + flow.settings.timeout_ms / 1000

        try:
            for node in order:
                if node.disabled:
                    record.node_runs.append(
                        NodeRun(node_id=node.id, status="skipped", duration_ms=0)
                    )
                    continue
                if cancel_event.is_set():
                    raise FlowCancelled()

                node_cls = self._registry.get(node.type)
                if node_cls is None:
                    raise LaniusError.of(
                        "engine.flow.unknownNodeType",
                        f"未知节点类型: {node.type}",
                        node_id=node.id,
                        details={"type": node.type},
                    )

                emit("execution.nodeStarted", {"nodeId": node.id})
                started = time.monotonic()
                remaining_ms = int((flow_deadline - time.monotonic()) * 1000)
                if remaining_ms <= 0:
                    raise LaniusError.of(
                        "engine.runtime.timeout",
                        "流程级超时预算已耗尽",
                        node_id=node.id,
                    )
                node_timeout_s = min(
                    float(node.config.get("timeoutMs", 30_000)), float(remaining_ms)
                ) / 1000

                ctx = NodeContext(
                    driver=self._driver,
                    scope=scope,
                    logger=logger.bind(nodeId=node.id),
                    cancel_event=cancel_event,
                    node_id=node.id,
                    config=node.config,
                    inputs=node.inputs,
                    emit=emit,
                )
                instance = node_cls()
                try:
                    result = await asyncio.wait_for(
                        instance.execute(ctx), timeout=node_timeout_s
                    )
                except TimeoutError:
                    raise LaniusError.of(
                        "engine.runtime.timeout",
                        f"节点 {node.id} 超过超时预算",
                        node_id=node.id,
                        retryable=True,
                    ) from None

                duration_ms = int((time.monotonic() - started) * 1000)
                if result.outputs:
                    scope.set(node.id, {"outputs": result.outputs})
                record.node_runs.append(
                    NodeRun(node_id=node.id, status="done", duration_ms=duration_ms)
                )
                emit(
                    "execution.nodeFinished",
                    {"nodeId": node.id, "status": "done", "durationMs": duration_ms},
                )

            machine.transition(ExecutionState.DONE)
        except FlowCancelled:
            machine.transition(ExecutionState.CANCELLED)
            record.error = {"code": "engine.runtime.cancelled", "message": "执行已被取消"}
        except LaniusError as err:
            machine.transition(ExecutionState.FAILED)
            record.error = err.error.model_dump(mode="json")

        record.state = machine.state
        emit("execution.stateChanged", {"from": "running", "to": machine.state.value})
        return record


def _topo_order(flow: FlowFile) -> list[Any]:
    """Kahn 拓扑排序；环在 M1 的 flow.validate 中拦截，这里兜底报错。"""
    nodes = {node.id: node for node in flow.nodes}
    indegree = {node.id: 0 for node in flow.nodes}
    for edge in flow.edges:
        if edge.kind == "control" and edge.to in indegree:
            indegree[edge.to] += 1
    queue = sorted((nid for nid, deg in indegree.items() if deg == 0))
    order: list[Any] = []
    while queue:
        nid = queue.pop(0)
        order.append(nodes[nid])
        for edge in flow.edges:
            if edge.kind == "control" and edge.from_ == nid and edge.to in indegree:
                indegree[edge.to] -= 1
                if indegree[edge.to] == 0:
                    queue.append(edge.to)
    if len(order) != len(flow.nodes):
        raise LaniusError.of(
            "engine.flow.cycleDetected",
            "流程图存在环或悬空连线，无法拓扑排序",
            details={"sorted": len(order), "total": len(flow.nodes)},
        )
    return order
