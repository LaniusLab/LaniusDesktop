"""协议层测试：帧处理单测 + 真实子进程端到端（NDJSON over stdio）。"""

import asyncio
import io
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

from lanius_engine.history import ExecutionHistory
from lanius_engine.models import FlowFile
from lanius_engine.rpc.methods import _apply_run_inputs, register_all
from lanius_engine.rpc.server import RpcServer

ENGINE_SRC = Path(__file__).resolve().parent.parent / "src"
EXAMPLE_FLOW = json.loads(
    (Path(__file__).resolve().parents[2] / "examples" / "hello.flow.json").read_text(
        encoding="utf-8"
    )
)


def make_server(tmp_path: Path | None = None) -> RpcServer:
    server = RpcServer()
    history = ExecutionHistory((tmp_path or Path("/tmp")) / "lanius-test-history.db")
    register_all(server, history=history)
    return server


@pytest.fixture
def server(tmp_path: Path) -> RpcServer:
    return make_server(tmp_path)


def frame(method: str, params: dict | None = None, frame_id: int = 1) -> bytes:
    return (
        json.dumps({"jsonrpc": "2.0", "id": frame_id, "method": method, "params": params or {}})
        + "\n"
    ).encode()


async def test_ping_roundtrip(server: RpcServer) -> None:
    response = await server.handle_frame(frame("engine.ping"))
    assert response is not None
    assert response["id"] == 1
    assert response["result"]["pong"] is True
    assert response["result"]["uptimeMs"] >= 0


async def test_hello_reports_registered_node_types(server: RpcServer) -> None:
    response = await server.handle_frame(frame("engine.hello", {"protocolVersion": "0.1.0"}))
    assert response is not None
    result = response["result"]
    assert result["protocolVersion"] == "0.1.0"
    assert "core.log" in result["nodeTypes"]
    assert "core.wait" in result["nodeTypes"]
    assert "keyboard.press" in result["nodeTypes"]
    assert "mouse.click" in result["nodeTypes"]
    assert "data.setVar" in result["nodeTypes"]
    assert "data.template" in result["nodeTypes"]
    assert "template.steps" in result["capabilities"]
    assert "execution.history" in result["capabilities"]


async def test_flow_validate_requires_binding_keys(server: RpcServer) -> None:
    flow = {
        "schemaVersion": 2,
        "id": "no-keys",
        "name": "缺键",
        "steps": [{"id": "key", "kind": "binding", "label": "空键"}],
    }
    response = await server.handle_frame(frame("flow.validate", {"flow": flow}))
    assert response is not None
    result = response["result"]
    assert result["ok"] is False
    assert result["issues"][0]["code"] == "engine.flow.validationFailed"
    assert result["issues"][0]["nodeId"] == "key"


def test_flow_start_inputs_override_target() -> None:
    flow = FlowFile.model_validate(EXAMPLE_FLOW)
    next_flow = _apply_run_inputs(
        flow,
        {
            "target": {
                "match": {"exe": "client.exe", "title": "", "className": "UnityWndClass"},
                "locate": {"channel": "vision", "source": "user"},
            }
        },
    )
    assert next_flow.target.match.exe == "client.exe"
    assert next_flow.target.locate.channel == "vision"
    assert next_flow.target.locate.source == "user"


async def test_unknown_method_returns_minus_32601(server: RpcServer) -> None:
    response = await server.handle_frame(frame("no.such.method"))
    assert response is not None
    assert response["error"]["code"] == -32601
    assert response["error"]["data"]["methodName"] == "no.such.method"


async def test_parse_error_returns_minus_32700(server: RpcServer) -> None:
    response = await server.handle_frame(b"not json\n")
    assert response is not None
    assert response["error"]["code"] == -32700


async def _wait_history(server: RpcServer, execution_id: str, *, timeout_s: float = 5.0) -> dict:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        got = await server.handle_frame(
            frame("execution.get", {"executionId": execution_id}, frame_id=99)
        )
        assert got is not None
        if "result" in got:
            record = got["result"]["record"]
            if record["state"] in ("done", "failed", "cancelled"):
                return record
        # 尚未落盘时 execution.get 返回业务错误，继续轮询
        await asyncio.sleep(0.02)
    raise AssertionError(f"execution {execution_id} did not finish")


async def test_flow_start_returns_id_immediately_then_finishes(server: RpcServer) -> None:
    response = await server.handle_frame(
        frame("flow.start", {"flow": EXAMPLE_FLOW, "mode": "dryRun"})
    )
    assert response is not None
    assert set(response["result"].keys()) == {"executionId"}
    execution_id = response["result"]["executionId"]
    record = await _wait_history(server, execution_id)
    assert record["state"] == "done"
    assert [run["status"] for run in record["nodeRuns"]] == ["done", "done", "done", "done", "done"]


async def test_flow_start_unknown_node_fails_in_history(server: RpcServer) -> None:
    flow = {
        "schemaVersion": 1,
        "id": "f1",
        "name": "bad",
        "nodes": [{"id": "n1", "type": "no.such.node", "config": {}}],
        "edges": [],
    }
    response = await server.handle_frame(frame("flow.start", {"flow": flow}))
    assert response is not None
    execution_id = response["result"]["executionId"]
    record = await _wait_history(server, execution_id)
    assert record["state"] == "failed"
    assert record["error"]["code"] == "engine.flow.unknownNodeType"
    assert record["error"]["node_id"] == "n1"


async def test_flow_start_emits_notify_frames(
    server: RpcServer, monkeypatch: pytest.MonkeyPatch
) -> None:
    notified: list[tuple[str, dict]] = []
    original = server.notify

    def capture(method: str, params: dict | None = None) -> None:
        # 与 RpcServer.notify 一致：注入当前请求的 traceId 后再记录
        payload = dict(params or {})
        if server.current_trace_id and "traceId" not in payload:
            payload["traceId"] = server.current_trace_id
        notified.append((method, payload))
        original(method, params)

    monkeypatch.setattr(server, "notify", capture)
    # 避免 structlog 控制台输出与协议帧抢 stdout；只断言 notify 调用
    monkeypatch.setattr(sys, "stdout", io.StringIO())
    request = (
        json.dumps(
            {
                "jsonrpc": "2.0",
                "id": 9,
                "method": "flow.start",
                "params": {"flow": EXAMPLE_FLOW, "mode": "dryRun"},
                "meta": {"traceId": "trace-notify"},
            }
        )
        + "\n"
    ).encode()
    response = await server.handle_frame(request)
    assert response is not None
    execution_id = response["result"]["executionId"]
    await _wait_history(server, execution_id)
    methods = [name for name, _ in notified]
    assert "execution.stateChanged" in methods
    assert "execution.nodeStarted" in methods
    assert "execution.nodeFinished" in methods
    assert any(payload.get("traceId") == "trace-notify" for _, payload in notified)


async def test_execution_get_and_list_after_start(server: RpcServer) -> None:
    start = await server.handle_frame(
        frame("flow.start", {"flow": EXAMPLE_FLOW, "mode": "dryRun"})
    )
    assert start is not None
    execution_id = start["result"]["executionId"]
    record = await _wait_history(server, execution_id)
    assert record["executionId"] == execution_id
    assert record["state"] == "done"
    assert len(record["nodeRuns"]) == 5

    got = await server.handle_frame(
        frame("execution.get", {"executionId": execution_id}, frame_id=2)
    )
    assert got is not None
    assert got["result"]["record"]["executionId"] == execution_id

    listed = await server.handle_frame(
        frame("execution.list", {"limit": 10, "offset": 0}, frame_id=3)
    )
    assert listed is not None
    assert listed["result"]["total"] >= 1
    assert any(r["executionId"] == execution_id for r in listed["result"]["records"])


def test_subprocess_end_to_end() -> None:
    """真实 stdio 管道：验证 NDJSON 帧在进程边界上完整往返。"""
    env = {**os.environ, "PYTHONPATH": str(ENGINE_SRC)}
    proc = subprocess.Popen(
        [sys.executable, "-m", "lanius_engine"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        env=env,
    )
    assert proc.stdin is not None and proc.stdout is not None
    try:
        proc.stdin.write(frame("engine.ping"))
        proc.stdin.flush()
        line = proc.stdout.readline()
        response = json.loads(line)
        assert response["result"]["pong"] is True

        proc.stdin.write(frame("engine.shutdown", frame_id=2))
        proc.stdin.flush()
        assert json.loads(proc.stdout.readline())["id"] == 2
        assert proc.wait(timeout=5) == 0
    finally:
        if proc.poll() is None:
            proc.kill()
