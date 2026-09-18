"""Driver 抽象：平台 UI 自动化能力接口（docs/ENGINE.md §3）。

M0 只定义模板执行需要的最小面；完整能力矩阵随 M4 平台实现补齐。
所有方法为 async：真实 driver 内部用 asyncio.to_thread 隔离阻塞调用。
"""

from abc import ABC, abstractmethod
from typing import Any


class Driver(ABC):
    @abstractmethod
    async def click(self, x: int, y: int, button: str = "left") -> None: ...

    @abstractmethod
    async def move(self, x: int, y: int) -> None: ...

    @abstractmethod
    async def press(self, keys: str) -> None: ...

    @abstractmethod
    async def type_text(self, text: str) -> None: ...

    @abstractmethod
    async def find_window(self, query: dict[str, Any]) -> str: ...

    @abstractmethod
    async def clipboard_get(self) -> str: ...

    @abstractmethod
    async def clipboard_set(self, text: str) -> None: ...
