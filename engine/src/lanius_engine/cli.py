"""引擎调试 CLI：lanius-engine validate <file.flow.json> / run --mock <file.flow.json>。

CLI 是开发者工具；应用内一切调用走 JSON-RPC（PROTOCOL.md）。
"""

import asyncio
import json
from pathlib import Path
from typing import Annotated

import typer

from lanius_engine.drivers.mock import MockDriver
from lanius_engine.logging import configure_logging
from lanius_engine.models import FlowFile, LaniusError
from lanius_engine.nodes.registry import default_registry
from lanius_engine.runtime.executor import Executor

app = typer.Typer(help="Lanius 引擎调试 CLI", no_args_is_help=True)


def _load_flow(path: Path) -> FlowFile:
    return FlowFile.model_validate(json.loads(path.read_text(encoding="utf-8")))


@app.command()
def validate(path: Annotated[Path, typer.Argument(help="流程文件路径")]) -> None:
    """静态校验流程文件。"""
    configure_logging()
    registry = default_registry()
    flow = _load_flow(path)
    known = set(registry.types())
    problems = [node for node in flow.nodes if node.type not in known]
    if problems:
        for node in problems:
            typer.secho(f"✗ {node.id}: 未知节点类型 {node.type}", fg=typer.colors.RED)
        raise typer.Exit(code=1)
    typer.secho(f"✓ {flow.name}：{len(flow.nodes)} 个节点校验通过", fg=typer.colors.GREEN)


@app.command()
def run(
    path: Annotated[Path, typer.Argument(help="流程文件路径")],
    dry_run: Annotated[bool, typer.Option("--dry-run", help="mock driver 预演")] = True,
) -> None:
    """在 mock driver 上执行流程（调试用，不触碰真实桌面）。"""
    configure_logging(debug=True)
    flow = _load_flow(path)
    executor = Executor(default_registry(), MockDriver())

    async def _run() -> int:
        try:
            record = await executor.start(flow, mode="dryRun" if dry_run else "run")
        except LaniusError as err:
            typer.secho(f"✗ {err.error.code}: {err.error.message}", fg=typer.colors.RED)
            return 1
        typer.echo(json.dumps(record.state.value))
        for node_run in record.node_runs:
            typer.echo(f"  {node_run.node_id}: {node_run.status} ({node_run.duration_ms}ms)")
        return 0 if record.state.value == "done" else 1

    raise typer.Exit(code=asyncio.run(_run()))


def main() -> None:
    app()


if __name__ == "__main__":
    main()
