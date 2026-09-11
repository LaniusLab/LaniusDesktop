"""执行状态机（docs/ENGINE.md §5.1）。非法迁移直接抛错，宁可响亮失败。"""

import enum

from lanius_engine.models import LaniusError


class ExecutionState(enum.StrEnum):
    IDLE = "idle"
    VALIDATING = "validating"
    RUNNING = "running"
    PAUSED = "paused"
    DONE = "done"
    FAILED = "failed"
    CANCELLED = "cancelled"


TERMINAL_STATES = {ExecutionState.DONE, ExecutionState.FAILED, ExecutionState.CANCELLED}

_TRANSITIONS: dict[ExecutionState, set[ExecutionState]] = {
    ExecutionState.IDLE: {ExecutionState.VALIDATING},
    ExecutionState.VALIDATING: {ExecutionState.RUNNING, ExecutionState.FAILED},
    ExecutionState.RUNNING: {
        ExecutionState.PAUSED,
        ExecutionState.DONE,
        ExecutionState.FAILED,
        ExecutionState.CANCELLED,
    },
    ExecutionState.PAUSED: {ExecutionState.RUNNING, ExecutionState.CANCELLED},
    ExecutionState.DONE: set(),
    ExecutionState.FAILED: set(),
    ExecutionState.CANCELLED: set(),
}


class ExecutionStateMachine:
    def __init__(self) -> None:
        self.state = ExecutionState.IDLE

    def transition(self, target: ExecutionState) -> ExecutionState:
        allowed = _TRANSITIONS[self.state]
        if target not in allowed:
            raise LaniusError.of(
                "engine.runtime.illegalTransition",
                f"执行状态不允许从 {self.state.value} 迁移到 {target.value}",
                details={"from": self.state.value, "to": target.value},
            )
        previous = self.state
        self.state = target
        return previous

    @property
    def is_terminal(self) -> bool:
        return self.state in TERMINAL_STATES
