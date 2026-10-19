"""协议层测试：帧处理单测 + 真实子进程端到端（NDJSON over stdio）。"""

import io
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from lanius_engine.history import HistoryStore
from lanius_engine.models import FlowFile
from lanius_engine.rpc.methods import _apply_run_inputs, register_all
from lanius_engine.rpc.server import RpcServer

ENGINE_SRC = Path(__file__).resolve().parent.parent / "src"
EXAMPLE_FLOW = json.loads(
    (Path(__file__).resolve().parents[2] / "examples" / "hello.flow.json").read_text(
        encoding="utf-8"
    )
)


def make_server(tmp_path: Path) -> tuple[RpcServer, io.StringIO]:
    server = RpcServer()
    out = io.StringIO()
    server._out = out
    register_all(server, HistoryStore(tmp_path / "history.db"))
    return server, out


def frame(
    method: str,
    params: dict | None = None,
    frame_id: int = 1,
    *,
    trace_id: str = "",
) -> bytes:
    payload: dict = {
        "jsonrpc": "2.0",
        "id": frame_id,
        "method": method,
        "params": params or {},
    }
    if trace_id:
        payload["meta"] = {"traceId": trace_id}
    return (json.dumps(payload) + "\n").encode()


async def test_ping_roundtrip(tmp_path: Path) -> None:
    server, _ = make_server(tmp_path)
    response = await server.handle_frame(frame("engine.ping"))
    assert response is not None
    assert response["id"] == 1
    assert response["result"]["pong"] is True
    assert response["result"]["uptimeMs"] >= 0


async def test_hello_reports_registered_node_types(tmp_path: Path) -> None:
    server, _ = make_server(tmp_path)
    response = await server.handle_frame(frame("engine.hello", {"protocolVersion": "0.1.0"}))
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


async def test_flow_validate_requires_binding_keys(tmp_path: Path) -> None:
    server, _ = make_server(tmp_path)
    flow = {
        "schemaVersion": 2,
        "id": "no-keys",
        "name": "缺键",
        "steps": [{"id": "key", "kind": "binding", "label": "空键"}],
    }
    response = await server.handle_frame(frame("flow.validate", {"flow": flow}))
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


async def test_unknown_method_returns_minus_32601(tmp_path: Path) -> None:
    server, _ = make_server(tmp_path)
    response = await server.handle_frame(frame("no.such.method"))
    assert response["error"]["code"] == -32601
    assert response["error"]["data"]["methodName"] == "no.such.method"


async def test_parse_error_returns_minus_32700(tmp_path: Path) -> None:
    server, _ = make_server(tmp_path)
    response = await server.handle_frame(b"not json\n")
    assert response["error"]["code"] == -32700


async def test_flow_start_runs_example_flow_and_persists(tmp_path: Path) -> None:
    server, out = make_server(tmp_path)
    response = await server.handle_frame(
        frame("flow.start", {"flow": EXAMPLE_FLOW, "mode": "dryRun"}, trace_id="trace-rpc-1")
    )
    result = response["result"]
    assert result["finalState"] == "done"
    assert [run["status"] for run in result["nodeRuns"]] == ["done", "done", "done", "done", "done"]

    notifies = [json.loads(line) for line in out.getvalue().splitlines()]
    methods = [n["method"] for n in notifies]
    assert "execution.stateChanged" in methods
    assert "execution.nodeStarted" in methods
    assert "execution.log" in methods
    assert all(n["params"].get("traceId") == "trace-rpc-1" for n in notifies)

    listed = await server.handle_frame(frame("execution.list", {"limit": 10}, frame_id=2))
    assert listed["result"]["total"] == 1
    execution_id = listed["result"]["records"][0]["executionId"]
    got = await server.handle_frame(
        frame("execution.get", {"executionId": execution_id}, frame_id=3)
    )
    assert got["result"]["record"]["traceId"] == "trace-rpc-1"


async def test_flow_start_rejects_unknown_node_type(tmp_path: Path) -> None:
    server, _ = make_server(tmp_path)
    flow = {
        "schemaVersion": 1,
        "id": "f1",
        "name": "bad",
        "nodes": [{"id": "n1", "type": "no.such.node", "config": {}}],
        "edges": [],
    }
    response = await server.handle_frame(frame("flow.start", {"flow": flow}))
    # 执行失败是数据而非传输错误：finalState=failed，错误模型在 result.error 中
    result = response["result"]
    assert result["finalState"] == "failed"
    assert result["error"]["code"] == "engine.flow.unknownNodeType"
    assert result["error"]["node_id"] == "n1"


async def test_execution_get_missing(tmp_path: Path) -> None:
    server, _ = make_server(tmp_path)
    response = await server.handle_frame(frame("execution.get", {"executionId": "nope"}))
    assert response["error"]["code"] == -32000
    assert response["error"]["data"]["code"] == "engine.runtime.notFound"


def test_subprocess_end_to_end(tmp_path: Path) -> None:
    """真实 stdio 管道：验证 NDJSON 帧在进程边界上完整往返。"""
    env = {
        **os.environ,
        "PYTHONPATH": str(ENGINE_SRC),
        "LANIUS_HISTORY_DB": str(tmp_path / "sub.db"),
    }
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


@pytest.mark.asyncio
async def test_notify_helper_writes_frame(tmp_path: Path) -> None:
    server, out = make_server(tmp_path)
    server.notify("execution.log", {"message": "x", "executionId": "e"})
    frame_obj = json.loads(out.getvalue().strip())
    assert frame_obj == {
        "jsonrpc": "2.0",
        "method": "execution.log",
        "params": {"message": "x", "executionId": "e"},
    }
