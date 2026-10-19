"""RPC schema + golden：校验 schemas/rpc 与样例帧必填键对齐（PROTOCOL.md §7）。"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCHEMAS = ROOT / "schemas" / "rpc"
GOLDEN = Path(__file__).resolve().parent / "golden" / "rpc"

METHOD_SCHEMAS = [
    "engine.hello.json",
    "engine.ping.json",
    "flow.start.json",
    "flow.migrate.json",
    "execution.get.json",
    "execution.list.json",
    "notifications.json",
]


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _required_of(schema: dict, def_name: str) -> list[str]:
    target = schema.get("$defs", {}).get(def_name, {})
    return list(target.get("required", []))


@pytest.mark.parametrize("name", METHOD_SCHEMAS)
def test_rpc_schema_files_exist_and_have_id(name: str) -> None:
    path = SCHEMAS / name
    assert path.is_file(), f"missing {path}"
    schema = _load(path)
    assert schema.get("$id", "").startswith("https://lanius.dev/schemas/rpc/")
    assert "$defs" in schema


def test_golden_hello_matches_schema_required() -> None:
    schema = _load(SCHEMAS / "engine.hello.json")
    golden = _load(GOLDEN / "engine.hello.result.json")
    for key in _required_of(schema, "result"):
        assert key in golden


def test_golden_ping_matches_schema_required() -> None:
    schema = _load(SCHEMAS / "engine.ping.json")
    golden = _load(GOLDEN / "engine.ping.result.json")
    for key in _required_of(schema, "result"):
        assert key in golden
    assert golden["pong"] is True


def test_golden_flow_start_matches_schema_required() -> None:
    schema = _load(SCHEMAS / "flow.start.json")
    golden = _load(GOLDEN / "flow.start.result.json")
    for key in _required_of(schema, "result"):
        assert key in golden


def test_golden_flow_migrate_matches_schema_required() -> None:
    schema = _load(SCHEMAS / "flow.migrate.json")
    golden = _load(GOLDEN / "flow.migrate.result.json")
    for key in _required_of(schema, "result"):
        assert key in golden
    assert golden["migratedFrom"] <= golden["migratedTo"]


def test_golden_state_changed_notification() -> None:
    schema = _load(SCHEMAS / "notifications.json")
    golden = _load(GOLDEN / "execution.stateChanged.params.json")
    for key in _required_of(schema, "execution.stateChanged"):
        assert key in golden


async def test_live_hello_and_ping_satisfy_golden_shape(tmp_path: Path) -> None:
    from lanius_engine.history import ExecutionHistory
    from lanius_engine.rpc.methods import register_all
    from lanius_engine.rpc.server import RpcServer

    server = RpcServer()
    register_all(server, history=ExecutionHistory(tmp_path / "h.db"))

    hello = await server.handle_frame(
        (
            json.dumps(
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "engine.hello",
                    "params": {"protocolVersion": "0.1.0"},
                }
            )
            + "\n"
        ).encode()
    )
    assert hello is not None
    for key in _required_of(_load(SCHEMAS / "engine.hello.json"), "result"):
        assert key in hello["result"]
    assert "core.assert" in hello["result"]["nodeTypes"]
    assert "fs.readText" in hello["result"]["nodeTypes"]

    ping_frame = json.dumps(
        {"jsonrpc": "2.0", "id": 2, "method": "engine.ping", "params": {}}
    )
    ping = await server.handle_frame((ping_frame + "\n").encode())
    assert ping is not None
    for key in _required_of(_load(SCHEMAS / "engine.ping.json"), "result"):
        assert key in ping["result"]
