"""执行历史 SQLite：落盘、查询、分页（docs/ENGINE.md §6）。"""

from pathlib import Path

from lanius_engine.history import ExecutionHistory, HistoryFilter, truncate_summary
from lanius_engine.models import LaniusError
from lanius_engine.runtime.executor import ExecutionRecord, NodeRun
from lanius_engine.runtime.state import ExecutionState


def _record(execution_id: str = "exec-1") -> ExecutionRecord:
    return ExecutionRecord(
        execution_id=execution_id,
        flow_id="flow-a",
        mode="dryRun",
        state=ExecutionState.DONE,
        node_runs=[
            NodeRun(node_id="n1", status="done", duration_ms=10, label="日志"),
        ],
    )


def test_save_get_list_roundtrip(tmp_path: Path) -> None:
    store = ExecutionHistory(tmp_path / "history.db")
    try:
        store.save(_record(), trace_id="trace-1", trigger="test")
        got = store.get("exec-1")
        assert got["executionId"] == "exec-1"
        assert got["flowId"] == "flow-a"
        assert got["state"] == "done"
        assert got["traceId"] == "trace-1"
        assert got["nodeRuns"][0]["nodeId"] == "n1"

        page = store.list(limit=10, offset=0)
        assert page["total"] == 1
        assert page["records"][0]["executionId"] == "exec-1"
    finally:
        store.close()


def test_get_missing_raises(tmp_path: Path) -> None:
    store = ExecutionHistory(tmp_path / "history.db")
    try:
        try:
            store.get("missing")
            raise AssertionError("expected notFound")
        except LaniusError as err:
            assert err.error.code == "engine.runtime.notFound"
    finally:
        store.close()


def test_list_filter_by_state(tmp_path: Path) -> None:
    store = ExecutionHistory(tmp_path / "history.db")
    try:
        store.save(_record("exec-done"), trace_id="t")
        failed = _record("exec-fail")
        failed.state = ExecutionState.FAILED
        failed.error = {"code": "engine.runtime.timeout", "message": "超时"}
        store.save(failed, trace_id="t2")
        page = store.list(filter=HistoryFilter(state="failed"))
        assert page["total"] == 1
        assert page["records"][0]["executionId"] == "exec-fail"
        assert page["records"][0]["error"]["code"] == "engine.runtime.timeout"
    finally:
        store.close()


def test_truncate_summary_marks_large_payload() -> None:
    big = "x" * (5 * 1024)
    out = truncate_summary(big)
    assert isinstance(out, dict)
    assert out["truncated"] is True
    assert "preview" in out
