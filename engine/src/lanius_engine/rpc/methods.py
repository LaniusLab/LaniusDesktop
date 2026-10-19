"""RPC 方法实现（注册制）。方法清单的权威文档见 docs/PROTOCOL.md §3。"""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

from lanius_engine import PROTOCOL_VERSION, __version__
from lanius_engine.drivers import create_driver, resolve_driver_name
from lanius_engine.history import ExecutionHistory, HistoryFilter
from lanius_engine.logging import get_logger
from lanius_engine.models import (
    FlowFile,
    FlowLocate,
    FlowStep,
    FlowTargetMatch,
    LaniusError,
    migrate_to_current,
)
from lanius_engine.nodes.registry import default_registry
from lanius_engine.rpc.server import RpcServer
from lanius_engine.runtime.executor import Executor
from lanius_engine.runtime.secrets import create_secret_provider

_log = get_logger(module="rpc.methods")


def register_all(server: RpcServer, history: ExecutionHistory | None = None) -> None:
    registry = default_registry()
    driver = create_driver()
    driver_name = resolve_driver_name()
    secrets = create_secret_provider()
    executor = Executor(registry, driver, secrets=secrets)
    store = history if history is not None else ExecutionHistory()

    async def hello(params: dict[str, Any]) -> dict[str, Any]:
        return {
            "protocolVersion": PROTOCOL_VERSION,
            "engineVersion": __version__,
            "capabilities": [
                "dryRun",
                "template.steps",
                "template.control",
                "locate.a11y",
                "vision.mock",
                "execution.history",
                "execution.pause",
                "fs.readWrite",
                "secrets.env",
                "driver.elementFind",
                f"driver.{driver_name}",
            ],
            "nodeTypes": registry.types(),
        }

    async def ping(params: dict[str, Any]) -> dict[str, Any]:
        return {"pong": True, "uptimeMs": server.uptime_ms}

    async def shutdown(params: dict[str, Any]) -> dict[str, Any]:
        server.stop()
        store.close()
        return {}

    server.active_executions_fn = lambda: executor.active_count

    async def flow_validate(params: dict[str, Any]) -> dict[str, Any]:
        flow = migrate_to_current(_parse_flow(params))
        issues: list[dict[str, Any]] = []
        known = set(registry.types()) | {
            "flow.if",
            "flow.loop",
            "flow.wait",
            "flow.subflow",
            "flow.tryCatch",
        }
        _validate_steps(flow.steps, known, issues)
        return {"ok": not any(i["severity"] == "error" for i in issues), "issues": issues}

    async def flow_migrate(params: dict[str, Any]) -> dict[str, Any]:
        raw = _parse_flow(params)
        migrated_from = raw.schema_version
        migrated = migrate_to_current(raw)
        return {
            "flow": migrated.model_dump(mode="json", by_alias=True),
            "migratedFrom": migrated_from,
            "migratedTo": migrated.schema_version,
        }

    async def flow_start(params: dict[str, Any]) -> dict[str, Any]:
        """立即返回 executionId；执行在后台跑，进度走通知，终态落历史。"""
        flow = _parse_flow(params)
        flow = _apply_run_inputs(flow, params.get("inputs"))
        mode = params.get("mode", "run")
        if mode not in ("run", "dryRun"):
            raise LaniusError.of(
                "engine.flow.validationFailed",
                f"非法执行模式: {mode!r}",
                details={"allowed": ["run", "dryRun"]},
            )
        if executor.active_count:
            raise LaniusError.of(
                "engine.runtime.busy",
                "已有执行实例在运行（键鼠为全局独占资源）",
                retryable=True,
            )

        execution_id = f"exec-{uuid.uuid4().hex[:12]}"
        trace_id = server.current_trace_id
        flow_path = params.get("path") if isinstance(params.get("path"), str) else None
        started_at = time.time()
        started = asyncio.Event()
        early_errors: list[LaniusError] = []

        def on_event(event: str, payload: dict[str, Any]) -> None:
            # 后台任务已离开请求 ContextVar；显式带上调度时的 traceId
            enriched = dict(payload)
            if trace_id:
                enriched.setdefault("traceId", trace_id)
            server.notify(event, enriched)

        async def job() -> None:
            try:
                record = await executor.start(
                    flow,
                    mode=mode,
                    on_event=on_event,
                    execution_id=execution_id,
                    on_started=lambda _eid: started.set(),
                )
                store.save(
                    record,
                    trace_id=trace_id,
                    flow_path=flow_path,
                    trigger="rpc.flow.start",
                    started_at=started_at,
                    finished_at=time.time(),
                )
            except LaniusError as err:
                early_errors.append(err)
                started.set()
                _log.warning(
                    "flow.start.rejected",
                    code=err.error.code,
                    executionId=execution_id,
                )
            except Exception:
                started.set()
                _log.exception("flow.start.backgroundFailed", executionId=execution_id)
                raise

        asyncio.create_task(job())
        await started.wait()
        if early_errors:
            raise early_errors[0]
        return {"executionId": execution_id}

    async def flow_cancel(params: dict[str, Any]) -> dict[str, Any]:
        execution_id = params.get("executionId")
        if isinstance(execution_id, str) and execution_id:
            active = executor.active_execution_id
            if active is not None and execution_id != active:
                raise LaniusError.of(
                    "engine.runtime.notFound",
                    f"执行实例不匹配: {execution_id}",
                    details={"executionId": execution_id, "active": active},
                )
        executor.cancel()
        return {}

    async def flow_pause(params: dict[str, Any]) -> dict[str, Any]:
        execution_id = params.get("executionId")
        if not isinstance(execution_id, str) or not execution_id:
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "params.executionId 必须是非空字符串",
                details={"missing": ["executionId"]},
            )
        executor.pause(execution_id)
        return {}

    async def flow_resume(params: dict[str, Any]) -> dict[str, Any]:
        execution_id = params.get("executionId")
        if not isinstance(execution_id, str) or not execution_id:
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "params.executionId 必须是非空字符串",
                details={"missing": ["executionId"]},
            )
        executor.resume(execution_id)
        return {}

    async def execution_get(params: dict[str, Any]) -> dict[str, Any]:
        execution_id = params.get("executionId")
        if not isinstance(execution_id, str) or not execution_id:
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "params.executionId 必须是非空字符串",
                details={"missing": ["executionId"]},
            )
        return {"record": store.get(execution_id)}

    async def execution_list(params: dict[str, Any]) -> dict[str, Any]:
        limit = int(params.get("limit", 50))
        offset = int(params.get("offset", 0))
        raw_filter = params.get("filter")
        hist_filter: HistoryFilter | None = None
        if isinstance(raw_filter, dict):
            state = raw_filter.get("state")
            flow_id = raw_filter.get("flowId")
            hist_filter = HistoryFilter(
                state=state if isinstance(state, str) else None,
                flow_id=flow_id if isinstance(flow_id, str) else None,
            )
        return store.list(limit=limit, offset=offset, filter=hist_filter)

    async def driver_element_find(params: dict[str, Any]) -> dict[str, Any]:
        """选择器测试：绑窗后 find_element，不点击。"""
        raw_match = params.get("match")
        if not isinstance(raw_match, dict):
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "driver.elementFind 需要 match 对象",
                details={"missing": ["match"]},
            )
        raw_locator = params.get("locator")
        if not isinstance(raw_locator, dict):
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "driver.elementFind 需要 locator 对象",
                details={"missing": ["locator"]},
            )
        name = str(raw_locator.get("name", "")).strip()
        auto_id = str(raw_locator.get("automationId", "")).strip()
        control_type = str(raw_locator.get("controlType", "")).strip()
        if not name and not auto_id and not control_type:
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "locator 至少填写 name、automationId 或 controlType 之一",
                details={"locator": raw_locator},
            )
        locator = {
            "name": name,
            "automationId": auto_id,
            "controlType": control_type,
        }
        raw_locate = params.get("locate")
        locate: dict[str, Any] = {
            "channel": "a11y",
            "source": "user",
            "capture": "client",
            "visionPack": "template",
        }
        if isinstance(raw_locate, dict):
            for key in ("channel", "source", "capture", "visionPack"):
                value = raw_locate.get(key)
                if isinstance(value, str) and value:
                    locate[key] = value

        query = {
            "exe": str(raw_match.get("exe", "")),
            "title": str(raw_match.get("title", "")),
            "className": str(raw_match.get("className", "")),
        }
        if not any(query.values()):
            raise LaniusError.of(
                "engine.flow.validationFailed",
                "match 至少填写 exe、title 或 className 之一",
                details={"match": query},
            )

        handle = await driver.find_window(query)
        await driver.activate(handle)
        await driver.set_locate(locate)
        element_id = await driver.find_element(locator)
        return {
            "found": True,
            "handle": handle,
            "elementId": element_id,
            "summary": {
                "name": name,
                "automationId": auto_id,
                "controlType": control_type,
            },
        }

    server.register("engine.hello", hello)
    server.register("engine.ping", ping)
    server.register("engine.shutdown", shutdown)
    server.register("flow.validate", flow_validate)
    server.register("flow.migrate", flow_migrate)
    server.register("flow.start", flow_start)
    server.register("flow.pause", flow_pause)
    server.register("flow.resume", flow_resume)
    server.register("flow.cancel", flow_cancel)
    server.register("execution.get", execution_get)
    server.register("execution.list", execution_list)
    server.register("driver.elementFind", driver_element_find)


def _validate_steps(
    steps: list[FlowStep], known: set[str], issues: list[dict[str, Any]]
) -> None:
    for step in steps:
        node_type = step.node_type()
        if not node_type or node_type not in known:
            issues.append(
                {
                    "severity": "error",
                    "code": "engine.flow.unknownNodeType",
                    "nodeId": step.id,
                    "message": f"未知节点类型: {node_type or step.kind}",
                }
            )
        elif step.kind == "binding":
            keys = step.keys or str(step.config.get("keys", "")).strip()
            if not keys:
                issues.append(
                    {
                        "severity": "error",
                        "code": "engine.flow.validationFailed",
                        "nodeId": step.id,
                        "message": "缺按键。在右侧「发出的键」里补上。",
                    }
                )
        if node_type == "core.wait":
            ms = step.config.get("ms", 0)
            if not isinstance(ms, (int, float)) or ms < 0:
                issues.append(
                    {
                        "severity": "error",
                        "code": "engine.flow.validationFailed",
                        "nodeId": step.id,
                        "message": "等待时间不能是负数。",
                    }
                )
        if node_type == "keyboard.type":
            text = str(step.config.get("text", "")).strip()
            if not text:
                issues.append(
                    {
                        "severity": "error",
                        "code": "engine.flow.validationFailed",
                        "nodeId": step.id,
                        "message": "文本内容不能为空。",
                    }
                )
        if step.then:
            _validate_steps(step.then, known, issues)
        if step.else_:
            _validate_steps(step.else_, known, issues)
        if step.body:
            _validate_steps(step.body, known, issues)


def _parse_flow(params: dict[str, Any]) -> FlowFile:
    raw = params.get("flow")
    if not isinstance(raw, dict):
        raise LaniusError.of(
            "engine.flow.validationFailed",
            "params.flow 必须是流程对象（M1 起支持 path 引用）",
        )
    try:
        return FlowFile.model_validate(raw)
    except ValueError as exc:
        raise LaniusError.of(
            "engine.flow.validationFailed",
            "流程文件不符合 schema",
            details={"cause": str(exc)},
        ) from exc


def _apply_run_inputs(flow: FlowFile, inputs: object) -> FlowFile:
    """开跑时覆盖目标进程与定位通道，不写回模板文件。"""
    if not isinstance(inputs, dict):
        return flow
    target = flow.target
    raw_match = inputs.get("target")
    if isinstance(raw_match, dict):
        nested = raw_match.get("match", raw_match)
        if isinstance(nested, dict):
            target = target.model_copy(
                update={"match": FlowTargetMatch.model_validate(nested)}
            )
        raw_locate = raw_match.get("locate")
        if isinstance(raw_locate, dict):
            target = target.model_copy(update={"locate": FlowLocate.model_validate(raw_locate)})
    raw_locate = inputs.get("locate")
    if isinstance(raw_locate, dict):
        target = target.model_copy(update={"locate": FlowLocate.model_validate(raw_locate)})
    return flow.model_copy(update={"target": target})
