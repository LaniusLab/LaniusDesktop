"""执行器：有序模板 + 嵌套控制 + 状态机 + 协作式取消（docs/ENGINE.md §5）。

schemaVersion 2+ 按 steps 顺序执行；v3 起 control（if/loop）可嵌套子列表。
"""

from __future__ import annotations

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
from lanius_engine.runtime.scope import ScopeChain, interpolate
from lanius_engine.runtime.state import ExecutionState, ExecutionStateMachine

EventHook = Callable[[str, dict[str, Any]], None]


@dataclass
class NodeRun:
    node_id: str
    status: Literal["done", "failed", "cancelled", "skipped"]
    duration_ms: int
    error_code: str | None = None
    label: str = ""


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
        self._lock = asyncio.Lock()
        self._cancel: asyncio.Event | None = None
        # set = 可运行；clear = 暂停中（协作式，在安全点等待）
        self._pause_gate = asyncio.Event()
        self._pause_gate.set()
        self._machine: ExecutionStateMachine | None = None
        self._execution_id: str | None = None
        self._emit: EventHook | None = None

    @property
    def active_execution_id(self) -> str | None:
        return self._execution_id

    @property
    def active_count(self) -> int:
        return 1 if self._lock.locked() else 0

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
            self._pause_gate.set()
            try:
                return await self._run(flow, mode=mode, on_event=on_event or (lambda _e, _p: None))
            finally:
                self._cancel = None
                self._machine = None
                self._execution_id = None
                self._emit = None
                self._pause_gate.set()

    def pause(self, execution_id: str | None = None) -> None:
        self._require_active(execution_id)
        if self._machine is None or self._machine.state != ExecutionState.RUNNING:
            raise LaniusError.of(
                "engine.runtime.illegalTransition",
                "仅 running 状态可暂停",
                details={"state": self._machine.state.value if self._machine else None},
            )
        self._pause_gate.clear()

    def resume(self, execution_id: str | None = None) -> None:
        self._require_active(execution_id)
        if self._machine is None or self._machine.state != ExecutionState.PAUSED:
            # 暂停请求已发出但尚未到安全点：允许 resume 解除门闩
            if self._machine is not None and self._machine.state == ExecutionState.RUNNING:
                self._pause_gate.set()
                return
            raise LaniusError.of(
                "engine.runtime.illegalTransition",
                "仅 paused（或暂停请求中）状态可继续",
                details={"state": self._machine.state.value if self._machine else None},
            )
        self._pause_gate.set()

    def cancel(self) -> None:
        if self._cancel is not None:
            self._cancel.set()
        # 若正挂在 pause 等待上，解除门闩以便取消路径继续
        self._pause_gate.set()

    def _require_active(self, execution_id: str | None) -> None:
        if self._execution_id is None or self._cancel is None:
            raise LaniusError.of(
                "engine.runtime.notFound",
                "当前没有可控制的执行实例",
            )
        if execution_id is not None and execution_id != self._execution_id:
            raise LaniusError.of(
                "engine.runtime.notFound",
                f"执行实例不匹配: {execution_id}",
                details={"executionId": execution_id, "active": self._execution_id},
            )

    async def _await_pause(
        self,
        *,
        machine: ExecutionStateMachine,
        emit: EventHook,
        cancel_event: asyncio.Event,
    ) -> None:
        if self._pause_gate.is_set():
            return
        if cancel_event.is_set():
            raise FlowCancelled()
        if machine.state == ExecutionState.RUNNING:
            machine.transition(ExecutionState.PAUSED)
            emit("execution.stateChanged", {"from": "running", "to": "paused"})
        await self._pause_gate.wait()
        if cancel_event.is_set():
            raise FlowCancelled()
        if machine.state == ExecutionState.PAUSED:
            machine.transition(ExecutionState.RUNNING)
            emit("execution.stateChanged", {"from": "paused", "to": "running"})

    async def _run(
        self, flow: FlowFile, *, mode: Literal["run", "dryRun"], on_event: EventHook
    ) -> ExecutionRecord:
        assert self._cancel is not None
        cancel_event = self._cancel
        machine = ExecutionStateMachine()
        self._machine = machine
        execution_id = f"exec-{uuid.uuid4().hex[:12]}"
        self._execution_id = execution_id
        self._emit = on_event
        logger = get_logger(executionId=execution_id)

        def emit(event: str, payload: dict[str, Any]) -> None:
            on_event(event, {"executionId": execution_id, **payload})

        async def await_pause() -> None:
            await self._await_pause(machine=machine, emit=emit, cancel_event=cancel_event)

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
                await self._driver.activate(target_handle)
                await self._driver.set_locate(
                    {
                        "channel": flow.target.locate.channel,
                        "source": flow.target.locate.source,
                        "capture": flow.target.locate.capture,
                        "visionPack": flow.target.locate.vision_pack,
                    }
                )

            await self._run_steps(
                flow.steps,
                record=record,
                scope=scope,
                logger=logger,
                emit=emit,
                cancel_event=cancel_event,
                flow_deadline=flow_deadline,
                await_pause=await_pause,
            )

            from_state = machine.state.value
            machine.transition(ExecutionState.DONE)
            emit("execution.stateChanged", {"from": from_state, "to": "done"})
        except FlowCancelled:
            from_state = machine.state.value
            machine.transition(ExecutionState.CANCELLED)
            record.error = {"code": "engine.runtime.cancelled", "message": "执行已被取消"}
            emit("execution.stateChanged", {"from": from_state, "to": "cancelled"})
        except LaniusError as err:
            from_state = machine.state.value
            machine.transition(ExecutionState.FAILED)
            record.error = err.error.model_dump(mode="json")
            emit("execution.stateChanged", {"from": from_state, "to": "failed"})

        record.state = machine.state
        if target_handle is not None:
            emit(
                "execution.targetBound",
                {
                    "handle": target_handle,
                    "locate": {
                        "channel": flow.target.locate.channel,
                        "source": flow.target.locate.source,
                        "capture": flow.target.locate.capture,
                        "visionPack": flow.target.locate.vision_pack,
                    },
                },
            )
        return record

    async def _run_steps(
        self,
        steps: list[FlowStep],
        *,
        record: ExecutionRecord,
        scope: ScopeChain,
        logger: Any,
        emit: EventHook,
        cancel_event: asyncio.Event,
        flow_deadline: float,
        await_pause: Callable[[], Any],
    ) -> None:
        for step in steps:
            if step.disabled:
                record.node_runs.append(
                    NodeRun(
                        node_id=step.id,
                        status="skipped",
                        duration_ms=0,
                        label=step.label,
                    )
                )
                continue
            if cancel_event.is_set():
                raise FlowCancelled()
            await await_pause()

            if step.kind == "control":
                await self._run_control(
                    step,
                    record=record,
                    scope=scope,
                    logger=logger,
                    emit=emit,
                    cancel_event=cancel_event,
                    flow_deadline=flow_deadline,
                    await_pause=await_pause,
                )
                continue

            await self._run_leaf(
                step,
                record=record,
                scope=scope,
                logger=logger,
                emit=emit,
                cancel_event=cancel_event,
                flow_deadline=flow_deadline,
                await_pause=await_pause,
            )

    async def _run_control(
        self,
        step: FlowStep,
        *,
        record: ExecutionRecord,
        scope: ScopeChain,
        logger: Any,
        emit: EventHook,
        cancel_event: asyncio.Event,
        flow_deadline: float,
        await_pause: Callable[[], Any],
    ) -> None:
        started = time.monotonic()
        emit("execution.nodeStarted", {"nodeId": step.id})
        node_type = step.node_type()
        try:
            if node_type == "flow.if":
                matched = _eval_condition(step, scope)
                branch = step.then if matched else step.else_
                emit(
                    "execution.log",
                    {
                        "nodeId": step.id,
                        "message": f"{step.label or step.id} → {'则' if matched else '否则'}",
                    },
                )
                await self._run_steps(
                    branch,
                    record=record,
                    scope=scope,
                    logger=logger,
                    emit=emit,
                    cancel_event=cancel_event,
                    flow_deadline=flow_deadline,
                    await_pause=await_pause,
                )
            elif node_type == "flow.loop":
                max_iter = int(step.config.get("max", step.config.get("times", 1)))
                until = str(step.config.get("until", "")).strip()
                for index in range(max(0, max_iter)):
                    if cancel_event.is_set():
                        raise FlowCancelled()
                    await await_pause()
                    scope.push({"index": index, "item": index})
                    try:
                        await self._run_steps(
                            step.body,
                            record=record,
                            scope=scope,
                            logger=logger,
                            emit=emit,
                            cancel_event=cancel_event,
                            flow_deadline=flow_deadline,
                            await_pause=await_pause,
                        )
                        if until and _eval_until(until, step, scope):
                            break
                    finally:
                        scope.pop()
            else:
                raise LaniusError.of(
                    "engine.flow.unknownNodeType",
                    f"未知控制类型: {node_type}",
                    node_id=step.id,
                    details={"type": node_type},
                )
        except LaniusError:
            duration_ms = int((time.monotonic() - started) * 1000)
            record.node_runs.append(
                NodeRun(
                    node_id=step.id,
                    status="failed",
                    duration_ms=duration_ms,
                    label=step.label,
                )
            )
            raise

        duration_ms = int((time.monotonic() - started) * 1000)
        record.node_runs.append(
            NodeRun(
                node_id=step.id,
                status="done",
                duration_ms=duration_ms,
                label=step.label,
            )
        )
        emit(
            "execution.nodeFinished",
            {"nodeId": step.id, "status": "done", "durationMs": duration_ms},
        )

    async def _run_leaf(
        self,
        step: FlowStep,
        *,
        record: ExecutionRecord,
        scope: ScopeChain,
        logger: Any,
        emit: EventHook,
        cancel_event: asyncio.Event,
        flow_deadline: float,
        await_pause: Callable[[], Any],
    ) -> None:
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
            await_pause=await_pause,
        )
        instance = node_cls()
        try:
            result = await asyncio.wait_for(instance.execute(ctx), timeout=node_timeout_s)
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
            if node_type.startswith("vision."):
                scope.set("ocr", result.outputs)
        record.node_runs.append(
            NodeRun(
                node_id=step.id,
                status="done",
                duration_ms=duration_ms,
                label=step.label,
            )
        )
        emit(
            "execution.nodeFinished",
            {"nodeId": step.id, "status": "done", "durationMs": duration_ms},
        )


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


def _eval_condition(step: FlowStep, scope: ScopeChain) -> bool:
    when = str(step.config.get("when", "contains"))
    needle = interpolate(str(step.config.get("text", "")), scope)
    source_expr = str(step.config.get("source", "{{ocr.text}}"))
    haystack = interpolate(source_expr, scope) if "{{" in source_expr else str(
        _resolve_loose(scope, source_expr)
    )
    if when in ("contains", "ocr.contains"):
        return needle in haystack
    if when in ("equals", "eq"):
        return haystack == needle
    if when in ("truthy", "true"):
        return bool(haystack)
    return needle in haystack


def _eval_until(until: str, step: FlowStep, scope: ScopeChain) -> bool:
    # until=ocr.contains 时复用 step.config.text
    probe = FlowStep(
        id=f"{step.id}__until",
        kind="control",
        type="flow.if",
        config={**step.config, "when": until},
    )
    return _eval_condition(probe, scope)


def _resolve_loose(scope: ScopeChain, path: str) -> Any:
    try:
        return scope.resolve(path)
    except LaniusError:
        return ""
