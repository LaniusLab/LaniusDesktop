"""sidecar 入口：stdio JSON-RPC 服务循环。

调试：echo '{"jsonrpc":"2.0","id":1,"method":"engine.ping","params":{}}' | python -m lanius_engine
"""

import asyncio

from lanius_engine.logging import configure_logging
from lanius_engine.rpc.methods import register_all
from lanius_engine.rpc.server import RpcServer


async def _amain() -> int:
    configure_logging()
    server = RpcServer()
    register_all(server)
    return await server.serve()


def main() -> int:
    try:
        return asyncio.run(_amain())
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
