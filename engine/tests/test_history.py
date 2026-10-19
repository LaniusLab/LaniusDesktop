"""执行历史落盘与查询。"""

from pathlib import Path

from lanius_engine.history import HistoryStore
from lanius_engine.runtime.executor import ExecutionRecord, NodeRun
from lanius_engine.runtime.state import ExecutionState


def test_history_roundtrip(tmp_path: Path) -> None:
    store = HistoryStore(tmp_path / "history.db")
    record = ExecutionRecord(
        execution_id="exec-1",
        flow_id="flow-a",
        mode="dryRun",
        state=ExecutionState.DONE,
        node_runs=[
            NodeRun(node_id="n1", status="done", duration_ms=10, label="日志"),
        ],
    )
    store.save(record, trace_id="trace-1", started_at_ms=1000, finished_at_ms=1100)

    got = store.get("exec-1")
    assert got is not None
    assert got["flowId"] == "flow-a"
    assert got["traceId"] == "trace-1"
    assert got["nodeRuns"][0]["nodeId"] == "n1"

    records, total = store.list(limit=10, offset=0)
    assert total == 1
    assert records[0]["executionId"] == "exec-1"
    assert store.get("missing") is None
    store.close()


def test_history_prune(tmp_path: Path) -> None:
    store = HistoryStore(tmp_path / "history.db")
    for i in range(5):
        store.save(
            ExecutionRecord(
                execution_id=f"exec-{i}",
                flow_id="f",
                mode="run",
                state=ExecutionState.DONE,
            ),
            started_at_ms=1000 + i,
            finished_at_ms=1001 + i,
        )
    store.prune(keep=2)
    _, total = store.list(limit=50)
    assert total == 2
    ids = {r["executionId"] for r in store.list(limit=50)[0]}
    assert ids == {"exec-3", "exec-4"}
    store.close()
