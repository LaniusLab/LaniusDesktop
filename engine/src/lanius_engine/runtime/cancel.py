"""协作式取消原语（docs/ENGINE.md §5.3）。"""

from lanius_engine.models import EngineError, LaniusError


class FlowCancelled(LaniusError):
    """节点在安全点检测到取消事件时抛出；执行器据此转入 cancelled 终态。"""

    def __init__(self) -> None:
        super().__init__(
            EngineError(
                code="engine.runtime.cancelled",
                message="执行已被取消",
                severity="info",
            )
        )
