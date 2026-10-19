"""SQLite 执行历史（docs/ENGINE.md §6）。

默认路径按平台惯例；可用 LANIUS_HISTORY_DB 覆盖（测试与打包）。
摘要字段超过 4 KiB 截断并标记 truncated。
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from lanius_engine.runtime.executor import ExecutionRecord, NodeRun

_SUMMARY_LIMIT = 4 * 1024
_DEFAULT_RETENTION = 10_000


@dataclass(frozen=True)
class HistoryPaths:
    db: Path


def default_history_path() -> Path:
    override = os.environ.get("LANIUS_HISTORY_DB", "").strip()
    if override:
        return Path(override)
    if sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
        return base / "lanius" / "history.db"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "lanius" / "history.db"
    xdg = os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))
    return Path(xdg) / "lanius" / "history.db"


def _truncate(value: Any) -> tuple[Any, bool]:
    raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(raw.encode("utf-8")) <= _SUMMARY_LIMIT:
        return value, False
    # 保留可读前缀，避免截断半个 UTF-8 字符
    clipped = raw.encode("utf-8")[:_SUMMARY_LIMIT].decode("utf-8", errors="ignore")
    return {"truncated": True, "preview": clipped}, True


class HistoryStore:
    """WAL 模式 SQLite；同步 API，由 asyncio 调用方经 to_thread 包装亦可。"""

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
              mode TEXT NOT NULL,
              state TEXT NOT NULL,
              started_at_ms INTEGER NOT NULL,
              finished_at_ms INTEGER NOT NULL,
              trace_id TEXT NOT NULL DEFAULT '',
              error_json TEXT,
              node_runs_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_executions_started
              ON executions(started_at_ms DESC);
            """
        )
        self._conn.commit()

    def save(
        self,
        record: ExecutionRecord,
        *,
        trace_id: str = "",
        started_at_ms: int | None = None,
        finished_at_ms: int | None = None,
    ) -> None:
        finished = finished_at_ms if finished_at_ms is not None else int(time.time() * 1000)
        started = started_at_ms if started_at_ms is not None else finished
        node_runs, _ = _truncate([_node_run_dict(run) for run in record.node_runs])
        error_payload: Any = record.error
        if error_payload is not None:
            error_payload, _ = _truncate(error_payload)
        self._conn.execute(
            """
            INSERT OR REPLACE INTO executions (
              id, flow_id, mode, state, started_at_ms, finished_at_ms,
              trace_id, error_json, node_runs_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record.execution_id,
                record.flow_id,
                record.mode,
                record.state.value,
                started,
                finished,
                trace_id,
                None if error_payload is None else json.dumps(error_payload, ensure_ascii=False),
                json.dumps(node_runs, ensure_ascii=False),
            ),
        )
        self._conn.commit()
        self.prune()

    def get(self, execution_id: str) -> dict[str, Any] | None:
        row = self._conn.execute(
            "SELECT * FROM executions WHERE id = ?", (execution_id,)
        ).fetchone()
        if row is None:
            return None
        return _row_to_record(row)

    def list(
        self, *, limit: int = 50, offset: int = 0, state: str | None = None
    ) -> tuple[list[dict[str, Any]], int]:
        limit = max(1, min(int(limit), 200))
        offset = max(0, int(offset))
        if state:
            total = self._conn.execute(
                "SELECT COUNT(*) FROM executions WHERE state = ?", (state,)
            ).fetchone()[0]
            rows = self._conn.execute(
                """
                SELECT * FROM executions WHERE state = ?
                ORDER BY started_at_ms DESC LIMIT ? OFFSET ?
                """,
                (state, limit, offset),
            ).fetchall()
        else:
            total = self._conn.execute("SELECT COUNT(*) FROM executions").fetchone()[0]
            rows = self._conn.execute(
                """
                SELECT * FROM executions
                ORDER BY started_at_ms DESC LIMIT ? OFFSET ?
                """,
                (limit, offset),
            ).fetchall()
        return [_row_to_record(row) for row in rows], int(total)

    def prune(self, keep: int = _DEFAULT_RETENTION) -> None:
        keep = max(1, keep)
        self._conn.execute(
            """
            DELETE FROM executions WHERE id IN (
              SELECT id FROM executions
              ORDER BY started_at_ms DESC
              LIMIT -1 OFFSET ?
            )
            """,
            (keep,),
        )
        self._conn.commit()


def _node_run_dict(run: NodeRun) -> dict[str, Any]:
    return {
        "nodeId": run.node_id,
        "status": run.status,
        "durationMs": run.duration_ms,
        "errorCode": run.error_code,
        "label": run.label,
    }


def _row_to_record(row: sqlite3.Row) -> dict[str, Any]:
    error = None
    if row["error_json"]:
        error = json.loads(row["error_json"])
    return {
        "executionId": row["id"],
        "flowId": row["flow_id"],
        "mode": row["mode"],
        "state": row["state"],
        "startedAtMs": row["started_at_ms"],
        "finishedAtMs": row["finished_at_ms"],
        "traceId": row["trace_id"],
        "error": error,
        "nodeRuns": json.loads(row["node_runs_json"]),
    }
