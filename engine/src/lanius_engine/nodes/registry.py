"""节点注册表：type → 节点类。注册表内容经 engine.hello 上报 UI（ENGINE.md §4.2）。"""

from lanius_engine.nodes.base import Node


class NodeRegistry:
    def __init__(self) -> None:
        self._nodes: dict[str, type[Node]] = {}

    def register(self, node_cls: type[Node]) -> type[Node]:
        node_type = node_cls.type
        if node_type in self._nodes:
            raise ValueError(f"节点类型重复注册: {node_type}")
        self._nodes[node_type] = node_cls
        return node_cls

    def get(self, node_type: str) -> type[Node] | None:
        return self._nodes.get(node_type)

    def types(self) -> list[str]:
        return sorted(self._nodes)


def default_registry() -> NodeRegistry:
    """内置节点在此装配；自定义节点经 entry points 发现（M1）。"""
    from lanius_engine.nodes.core.log import LogNode
    from lanius_engine.nodes.core.wait import WaitNode

    registry = NodeRegistry()
    registry.register(LogNode)
    registry.register(WaitNode)
    return registry
