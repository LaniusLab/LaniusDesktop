"""变量作用域链与模板插值（docs/ENGINE.md §5.5）。

三层：节点局部 → 循环帧 → 流程全局，查找自内向外。
插值只支持 {{ dotted.path }} 取值，不做任意表达式求值（安全红线：无 eval）。
"""

import re
from dataclasses import dataclass, field
from typing import Any

from lanius_engine.models import LaniusError

_PATTERN = re.compile(r"\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}")


@dataclass
class ScopeChain:
    frames: list[dict[str, Any]] = field(default_factory=lambda: [{}])

    def push(self, initial: dict[str, Any] | None = None) -> None:
        self.frames.append(initial or {})

    def pop(self) -> None:
        if len(self.frames) <= 1:
            raise RuntimeError("流程全局作用域不可弹出")
        self.frames.pop()

    def set(self, name: str, value: Any) -> None:
        self.frames[-1][name] = value

    def resolve(self, path: str) -> Any:
        """按点分路径自内向外查找；找不到即错误，不静默返回空。"""
        head, *rest = path.split(".")
        for frame in reversed(self.frames):
            if head in frame:
                value: Any = frame[head]
                for key in rest:
                    if not isinstance(value, dict) or key not in value:
                        raise LaniusError.of(
                            "engine.runtime.variableNotFound",
                            f"变量路径不存在: {path}（在 {key!r} 处中断）",
                            details={"path": path},
                        )
                    value = value[key]
                return value
        raise LaniusError.of(
            "engine.runtime.variableNotFound",
            f"未定义的变量: {head}",
            details={"path": path},
        )


def interpolate(text: str, scope: ScopeChain) -> str:
    """把 {{ path.to.var }} 替换为作用域中的值；非字符串值经 str() 渲染。"""

    def _replace(match: re.Match[str]) -> str:
        return str(scope.resolve(match.group(1)))

    return _PATTERN.sub(_replace, text)
