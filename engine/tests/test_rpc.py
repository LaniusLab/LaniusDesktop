"""协议层测试：帧处理单测 + 真实子进程端到端（NDJSON over stdio）。"""

import json
import os
import subprocess
import sys
from pathlib import Path

from lanius_engine.rpc.methods import register_all
from lanius_engine.rpc.server import RpcServer

ENGINE_SRC = Path(__file__).resolve().parent.parent / "src"
EXAMPLE_FLOW = json.loads(
    (Path(__file__).resolve().parents[2] / "examples" / "hello.flow.json").read_text()
)


def make_server() -> RpcServer:
    server = RpcServer()
    register_all(server)
    return server


def frame(method: str, params: dict | None = None, frame_id: int = 1) -> bytes:
    return (
        json.dumps({"jsonrpc": "2.0", "id": frame_id, "method": method, "params": params or {}})
        + "\n"
    ).encode()


async def test_ping_roundtrip() -> None:
    server = make_server()
    response = await server.handle_frame(frame("engine.ping"))
    assert response is not None
    assert response["id"] == 1
    assert response["result"]["pong"] is True
    assert response["result"]["uptimeMs"] >= 0


async def test_hello_reports_registered_node_types() -> None:
    server = make_server()
    response = await server.handle_frame(frame("engine.hello", {"protocolVersion": "0.1.0"}))
    result = response["result"]
    assert result["protocolVersion"] == "0.1.0"
    assert "core.log" in result["nodeTypes"]
    assert "core.wait" in result["nodeTypes"]


async def test_unknown_method_returns_minus_32601() -> None:
    server = make_server()
    response = await server.handle_frame(frame("no.such.method"))
    assert response["error"]["code"] == -32601
    assert response["error"]["data"]["methodName"] == "no.such.method"


async def test_parse_error_returns_minus_32700() -> None:
    server = make_server()
    response = await server.handle_frame(b"not json\n")
    assert response["error"]["code"] == -32700


async def test_flow_start_runs_example_flow() -> None:
    server = make_server()
    response = await server.handle_frame(
        frame("flow.start", {"flow": EXAMPLE_FLOW, "mode": "dryRun"})
    )
    result = response["result"]
    assert result["finalState"] == "done"
    assert [run["status"] for run in result["nodeRuns"]] == ["done", "done", "done"]


async def test_flow_start_rejects_unknown_node_type() -> None:
    server = make_server()
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
