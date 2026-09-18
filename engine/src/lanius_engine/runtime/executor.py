"""执行器：有序模板 + 状态机 + 协作式取消 + 双层超时（docs/ENGINE.md §5）。

schemaVersion 2 起按 steps 顺序执行；v1 DAG 在进入执行前迁移。
"""

import asyncio
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Literal

from lanius_engine.drivers.base import Driver
from lanius_engine.logging import get_logger
from lanius_engine.models import FlowFile, FlowStep, LaniusError, migrate_to_current
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
            flow = migrate_to_current(flow)
        except LaniusError as err:
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
        target_handle: str | None = None

        try:
            if not flow.target.match.is_empty():
                target_handle = await self._driver.find_window(
                    {
                        "exe": flow.target.match.exe,
                        "title": flow.target.match.title,
                        "className": flow.target.match.class_name,
                    }
                )

            for step in flow.steps:
                if step.disabled:
                    record.node_runs.append(
                        NodeRun(node_id=step.id, status="skipped", duration_ms=0)
                    )
                    continue
                if cancel_event.is_set():
                    raise FlowCancelled()

                node_type = _resolve_step_type(step)
                node_cls = self._registry.get(node_type)
                if node_cls is None:
                    raise LaniusError.of(
                        "engine.flow.unknownNodeType",
                        f"未知节点类型: {node_type}",
                        node_id=step.id,
                        details={"type": node_type, "kind": step.kind},
                    )

                emit("execution.nodeStarted", {"nodeId": step.id})
                started = time.monotonic()
                remaining_ms = int((flow_deadline - time.monotonic()) * 1000)
                if remaining_ms <= 0:
                    raise LaniusError.of(
                        "engine.runtime.timeout",
                        "流程级超时预算已耗尽",
                        node_id=step.id,
                    )
                node_timeout_s = min(
                    float(step.config.get("timeoutMs", 30_000)), float(remaining_ms)
                ) / 1000

                ctx = NodeContext(
                    driver=self._driver,
                    scope=scope,
                    logger=logger.bind(nodeId=step.id),
                    cancel_event=cancel_event,
                    node_id=step.id,
                    config=_step_config(step),
                    inputs={},
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
                        f"节点 {step.id} 超过超时预算",
                        node_id=step.id,
                        retryable=True,
                    ) from None

                duration_ms = int((time.monotonic() - started) * 1000)
                if result.outputs:
                    scope.set(step.id, {"outputs": result.outputs})
                record.node_runs.append(
                    NodeRun(node_id=step.id, status="done", duration_ms=duration_ms)
                )
                emit(
                    "execution.nodeFinished",
                    {"nodeId": step.id, "status": "done", "durationMs": duration_ms},
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
        if target_handle is not None:
            emit("execution.targetBound", {"handle": target_handle})
        return record


def _resolve_step_type(step: FlowStep) -> str:
    node_type = step.node_type()
    if not node_type:
        raise LaniusError.of(
            "engine.flow.unknownNodeType",
            f"步骤 {step.id} 缺少可执行类型",
            node_id=step.id,
            details={"kind": step.kind},
        )
    return node_type


def _step_config(step: FlowStep) -> dict[str, Any]:
    config = dict(step.config)
    if step.kind == "binding" and step.keys and "keys" not in config:
        config["keys"] = step.keys
    return config
