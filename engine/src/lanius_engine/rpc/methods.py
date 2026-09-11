"""RPC 方法实现（注册制）。方法清单的权威文档见 docs/PROTOCOL.md §3。"""

from typing import Any

from lanius_engine import PROTOCOL_VERSION, __version__
from lanius_engine.drivers.mock import MockDriver
from lanius_engine.models import FlowFile, LaniusError
from lanius_engine.nodes.registry import default_registry
from lanius_engine.rpc.server import RpcServer
from lanius_engine.runtime.executor import Executor


def register_all(server: RpcServer) -> None:
    registry = default_registry()
    # M0/M1 统一使用 mock driver；平台 driver 的选择逻辑随 M4 落地
    executor = Executor(registry, MockDriver())

    async def hello(params: dict[str, Any]) -> dict[str, Any]:
        return {
            "protocolVersion": PROTOCOL_VERSION,
            "engineVersion": __version__,
            "capabilities": ["dryRun"],
            "nodeTypes": registry.types(),
        }

    async def ping(params: dict[str, Any]) -> dict[str, Any]:
        return {"pong": True, "uptimeMs": server.uptime_ms}

    async def shutdown(params: dict[str, Any]) -> dict[str, Any]:
        server.stop()
        return {}

    async def flow_validate(params: dict[str, Any]) -> dict[str, Any]:
        flow = _parse_flow(params)
        issues: list[dict[str, Any]] = []
        known = set(registry.types())
        for node in flow.nodes:
            if node.type not in known:
                issues.append(
                    {
                        "severity": "error",
                        "code": "engine.flow.unknownNodeType",
                        "nodeId": node.id,
                        "message": f"未知节点类型: {node.type}",
                    }
                )
        return {"ok": not any(i["severity"] == "error" for i in issues), "issues": issues}

    async def flow_start(params: dict[str, Any]) -> dict[str, Any]:
        flow = _parse_flow(params)
        mode = params.get("mode", "run")
        if mode not in ("run", "dryRun"):
            raise LaniusError.of(
                "engine.flow.validationFailed",
                f"非法执行模式: {mode!r}",
                details={"allowed": ["run", "dryRun"]},
            )
        record = await executor.start(flow, mode=mode)
        return {
            "executionId": record.execution_id,
            "finalState": record.state.value,
            "nodeRuns": [vars(run) for run in record.node_runs],
            "error": record.error,
        }

    async def flow_cancel(params: dict[str, Any]) -> dict[str, Any]:
        executor.cancel()
        return {}

    server.register("engine.hello", hello)
    server.register("engine.ping", ping)
    server.register("engine.shutdown", shutdown)
    server.register("flow.validate", flow_validate)
    server.register("flow.start", flow_start)
    server.register("flow.cancel", flow_cancel)


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
