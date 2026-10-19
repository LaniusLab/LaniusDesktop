# RPC 方法 Schema

真源：本目录 JSON Schema（draft 2020-12）。对照 [docs/PROTOCOL.md](../../docs/PROTOCOL.md) §3。

| 文件 | 方法 / 通知 |
| --- | --- |
| `engine.hello.json` | `engine.hello` |
| `engine.ping.json` | `engine.ping` |
| `flow.start.json` | `flow.start` |
| `flow.migrate.json` | `flow.migrate` |
| `execution.get.json` | `execution.get` |
| `execution.list.json` | `execution.list` |
| `notifications.json` | `execution.*` / `engine.heartbeat` |
| `driver.elementFind.json` | `driver.elementFind` |
| `flow.inspect.json` | `flow.inspect` |

Golden 样例见 `engine/tests/golden/rpc/`；由 `engine/tests/test_rpc_golden.py` 校验必填键。
