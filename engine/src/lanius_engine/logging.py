"""structlog 配置：JSON 渲染、写 stderr（stdout 是协议通道，见 PROTOCOL.md §1）。

内置脱敏处理器：已解析凭据明文、Authorization 头 → ***（SECURITY.md §6）。
"""

from __future__ import annotations

import logging
import sys
from collections.abc import MutableMapping
from typing import Any

import structlog

from lanius_engine.runtime.secrets import get_secret_registry


def _redact_event(
    _logger: Any, _method: str, event_dict: MutableMapping[str, Any]
) -> MutableMapping[str, Any]:
    registry = get_secret_registry()
    scrubbed = registry.redact(dict(event_dict))
    if not isinstance(scrubbed, dict):
        return event_dict
    event_dict.clear()
    event_dict.update(scrubbed)
    return event_dict


def configure_logging(*, debug: bool = False) -> None:
    logging.basicConfig(stream=sys.stderr, level=logging.DEBUG if debug else logging.INFO)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", key="ts"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            _redact_event,
            structlog.processors.JSONRenderer(ensure_ascii=False),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.DEBUG if debug else logging.INFO
        ),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stderr),
        cache_logger_on_first_use=True,
    )


def get_logger(**bind: object) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(**bind)
