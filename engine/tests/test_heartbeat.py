"""engine.heartbeat 定时通知。"""

import asyncio

from lanius_engine.rpc.server import RpcServer


async def test_heartbeat_emits_notify(monkeypatch) -> None:
    server = RpcServer()
    server.heartbeat_interval_s = 0.05
    server.active_executions_fn = lambda: 2
    seen: list[dict] = []

    def capture(method: str, params: dict | None = None) -> None:
        if method == "engine.heartbeat":
            seen.append(dict(params or {}))

    monkeypatch.setattr(server, "notify", capture)
    task = asyncio.create_task(server.serve())
    # serve 需要 stdin；直接跑 heartbeat loop
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    loop_task = asyncio.create_task(server._heartbeat_loop())
    await asyncio.sleep(0.12)
    server.stop()
    await asyncio.wait_for(loop_task, timeout=1)
    assert len(seen) >= 1
    assert seen[0]["activeExecutions"] == 2
    assert "uptimeMs" in seen[0]
