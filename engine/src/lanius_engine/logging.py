"""structlog 配置：JSON 渲染、写 stderr（stdout 是协议通道，见 PROTOCOL.md §1）。"""

import logging
import sys

import structlog


def configure_logging(*, debug: bool = False) -> None:
    logging.basicConfig(stream=sys.stderr, level=logging.DEBUG if debug else logging.INFO)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", key="ts"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
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
