"""流程图拓扑排序。v1 DAG 迁移与执行器共用，避免环状 import。"""

from lanius_engine.models import FlowFile, FlowNode, LaniusError


def topo_order(flow: FlowFile) -> list[FlowNode]:
    """Kahn 拓扑排序；环在校验/迁移期拦截。"""
    nodes = {node.id: node for node in flow.nodes}
    indegree = {node.id: 0 for node in flow.nodes}
    for edge in flow.edges:
        if edge.kind == "control" and edge.to in indegree:
            indegree[edge.to] += 1
    queue = sorted((nid for nid, deg in indegree.items() if deg == 0))
    order: list[FlowNode] = []
    while queue:
        nid = queue.pop(0)
        order.append(nodes[nid])
        for edge in flow.edges:
            if edge.kind == "control" and edge.from_ == nid and edge.to in indegree:
                indegree[edge.to] -= 1
                if indegree[edge.to] == 0:
                    queue.append(edge.to)
    if len(order) != len(flow.nodes):
        raise LaniusError.of(
            "engine.flow.cycleDetected",
            "流程图存在环或悬空连线，无法拓扑排序",
            details={"sorted": len(order), "total": len(flow.nodes)},
        )
    return order
