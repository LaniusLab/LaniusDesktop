"""SQLite 执行历史（docs/ENGINE.md §6）。

默认路径遵循 XDG：`~/.local/share/lanius/history.db`；
测试与调试可用环境变量 `LANIUS_HISTORY_DB` 覆盖。
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from lanius_engine.models import LaniusError
from lanius_engine.runtime.executor import ExecutionRecord

SUMMARY_LIMIT = 4 * 1024
DEFAULT_RETENTION = 10_000


def default_history_path() -> Path:
    override = os.environ.get("LANIUS_HISTORY_DB", "").strip()
    if override:
        return Path(override)
    xdg = os.environ.get("XDG_DATA_HOME", "").strip()
    root = Path(xdg) if xdg else Path.home() / ".local" / "share"
    return root / "lanius" / "history.db"


@dataclass(frozen=True)
class HistoryFilter:
    state: str | None = None
    flow_id: str | None = None


class ExecutionHistory:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or default_history_path()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._migrate()

    def close(self) -> None:
        self._conn.close()

    def _migrate(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS executions (
              id TEXT PRIMARY KEY,
              flow_id TEXT NOT NULL,
              flow_path TEXT,
              mode TEXT NOT NULL,
              trigger TEXT,
              state TEXT NOT NULL,
              started_at REAL NOT NULL,
              finished_at REAL,
              trace_id TEXT,
              error_json TEXT
            );
            CREATE TABLE IF NOT EXISTS node_runs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
              seq INTEGER NOT NULL,
              node_id TEXT NOT NULL,
              status TEXT NOT NULL,
              duration_ms INTEGER NOT NULL,
              error_code TEXT,
              label TEXT,
              inputs_summary TEXT,
              outputs_summary TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_executions_started
              ON executions(started_at DESC);
            CREATE INDEX IF NOT EXISTS idx_node_runs_execution
              ON node_runs(execution_id, seq);
            """
        )
        self._conn.commit()

    def save(
        self,
        record: ExecutionRecord,
        *,
        trace_id: str = "",
        flow_path: str | None = None,
        trigger: str | None = None,
        started_at: float | None = None,
        finished_at: float | None = None,
    ) -> None:
        finished = finished_at if finished_at is not None else time.time()
        started = started_at if started_at is not None else finished
        error_json = (
            json.dumps(record.error, ensure_ascii=False) if record.error is not None else None
        )
        self._conn.execute(
            """
            INSERT OR REPLACE INTO executions (
              id, flow_id, flow_path, mode, trigger, state,
              started_at, finished_at, trace_id, error_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record.execution_id,
                record.flow_id,
                flow_path,
                record.mode,
                trigger,
                record.state.value,
                started,
                finished,
                trace_id or None,
                error_json,
            ),
        )
        self._conn.execute("DELETE FROM node_runs WHERE execution_id = ?", (record.execution_id,))
        for seq, run in enumerate(record.node_runs):
            self._conn.execute(
                """
                INSERT INTO node_runs
                  (execution_id, seq, node_id, status, duration_ms, error_code, label,
                   inputs_summary, outputs_summary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.execution_id,
                    seq,
                    run.node_id,
                    run.status,
                    run.duration_ms,
                    run.error_code,
                    run.label,
                    None,
                    None,
                ),
            )
        self._conn.commit()
        self._prune()

    def get(self, execution_id: str) -> dict[str, Any]:
        row = self._conn.execute(
            "SELECT * FROM executions WHERE id = ?", (execution_id,)
        ).fetchone()
        if row is None:
            raise LaniusError.of(
                "engine.runtime.notFound",
                f"执行记录不存在: {execution_id}",
                details={"executionId": execution_id},
            )
        runs = self._conn.execute(
            """
            SELECT node_id, status, duration_ms, error_code, label, inputs_summary, outputs_summary
            FROM node_runs WHERE execution_id = ? ORDER BY seq ASC
            """,
            (execution_id,),
        ).fetchall()
        return _row_to_record(row, runs)

    def list(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        filter: HistoryFilter | None = None,
    ) -> dict[str, Any]:
        limit = max(0, min(limit, 500))
        offset = max(0, offset)
        where: list[str] = []
        args: list[Any] = []
        if filter is not None:
            if filter.state:
                where.append("state = ?")
                args.append(filter.state)
            if filter.flow_id:
                where.append("flow_id = ?")
                args.append(filter.flow_id)
        clause = f"WHERE {' AND '.join(where)}" if where else ""
        total_row = self._conn.execute(
            f"SELECT COUNT(*) AS n FROM executions {clause}", args
        ).fetchone()
        total = int(total_row["n"]) if total_row is not None else 0
        rows = self._conn.execute(
            f"""
            SELECT * FROM executions {clause}
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
            """,
            [*args, limit, offset],
        ).fetchall()
        records = [_row_to_record(row, []) for row in rows]
        return {"records": records, "total": total}

    def _prune(self) -> None:
        """保留最近 DEFAULT_RETENTION 条；空闲清理的简化版。"""
        self._conn.execute(
            """
            DELETE FROM executions WHERE id NOT IN (
              SELECT id FROM executions ORDER BY started_at DESC LIMIT ?
            )
            """,
            (DEFAULT_RETENTION,),
        )
        self._conn.commit()


def _row_to_record(row: sqlite3.Row, runs: list[sqlite3.Row]) -> dict[str, Any]:
    error: dict[str, Any] | None = None
    raw_error = row["error_json"]
    if raw_error:
        try:
            parsed = json.loads(raw_error)
            if isinstance(parsed, dict):
                error = parsed
        except json.JSONDecodeError:
            error = {"message": str(raw_error)}
    node_runs = [
        {
            "nodeId": run["node_id"],
            "status": run["status"],
            "durationMs": run["duration_ms"],
            "errorCode": run["error_code"],
            "label": run["label"] or "",
            "inputsSummary": _maybe_json(run["inputs_summary"]),
            "outputsSummary": _maybe_json(run["outputs_summary"]),
        }
        for run in runs
    ]
    return {
        "executionId": row["id"],
        "flowId": row["flow_id"],
        "flowPath": row["flow_path"],
        "mode": row["mode"],
        "trigger": row["trigger"],
        "state": row["state"],
        "startedAt": row["started_at"],
        "finishedAt": row["finished_at"],
        "traceId": row["trace_id"],
        "error": error,
        "nodeRuns": node_runs,
    }


def _maybe_json(raw: str | None) -> Any:
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def truncate_summary(value: Any) -> dict[str, Any] | Any:
    """脱敏后截断：单字段 > 4 KiB 标记 truncated（ENGINE.md §6 / SECURITY.md §6）。"""
    from lanius_engine.runtime.secrets import get_secret_registry

    scrubbed = get_secret_registry().redact(value)
    text = (
        json.dumps(scrubbed, ensure_ascii=False)
        if not isinstance(scrubbed, str)
        else scrubbed
    )
    if len(text.encode("utf-8")) <= SUMMARY_LIMIT:
        return scrubbed
    clipped = text.encode("utf-8")[:SUMMARY_LIMIT].decode("utf-8", errors="ignore")
    return {"truncated": True, "preview": clipped}
