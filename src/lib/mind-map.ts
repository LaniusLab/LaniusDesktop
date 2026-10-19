import type { LocateProfile, TargetMatch } from "@/lib/targets";
import type { TemplateStep } from "@/lib/template";

export interface MindNode {
  id: string;
  label: string;
  kind: string;
  stepId?: string;
}

export interface MindEdge {
  from: string;
  to: string;
}

export interface MindTree {
  nodes: MindNode[];
  edges: MindEdge[];
}

export interface MindLayoutNode extends MindNode {
  x: number;
  y: number;
  rank: number;
}

export interface MindLayout {
  nodes: MindLayoutNode[];
  edges: Array<MindEdge & { x1: number; y1: number; x2: number; y2: number }>;
  width: number;
  height: number;
}

/** 把模板 steps 投影成思维导图树（只读预览，非编辑真源）。 */
export function stepsToMindTree(input: {
  name: string;
  match: TargetMatch;
  locate: LocateProfile;
  steps: TemplateStep[];
}): MindTree {
  const nodes: MindNode[] = [
    { id: "root", label: input.name || "当前模板", kind: "根" },
  ];
  const edges: MindEdge[] = [];
  const targetLabel = [input.match.exe || "窗口", input.locate.channel === "vision" ? "画面" : "控件"]
    .filter(Boolean)
    .join(" · ");
  nodes.push({ id: "target", label: targetLabel, kind: "目标" });
  edges.push({ from: "root", to: "target" });

  const walk = (steps: TemplateStep[], parentId: string) => {
    for (const step of steps) {
      const kind =
        step.kind === "control"
          ? step.type === "flow.loop"
            ? "循环"
            : "条件"
          : step.type.startsWith("vision.")
            ? "识图"
            : step.kind === "binding"
              ? "按键"
              : step.kind === "mouse"
                ? "鼠标"
                : "预设";
      nodes.push({ id: step.id, label: step.label || step.id, kind, stepId: step.id });
      edges.push({ from: parentId, to: step.id });
      if (step.kind === "control" && step.type === "flow.if") {
        const thenId = `${step.id}__then`;
        const elseId = `${step.id}__else`;
        nodes.push({ id: thenId, label: "则", kind: "分支" });
        nodes.push({ id: elseId, label: "否则", kind: "分支" });
        edges.push({ from: step.id, to: thenId });
        edges.push({ from: step.id, to: elseId });
        walk(step.then ?? [], thenId);
        walk(step.else ?? [], elseId);
      }
      if (step.kind === "control" && step.type === "flow.loop") {
        walk(step.body ?? [], step.id);
      }
    }
  };
  walk(input.steps, "root");
  return { nodes, edges };
}

/** 简单横向分层布局（无第三方依赖）。 */
export function layoutMindTree(tree: MindTree): MindLayout {
  const children = new Map<string, string[]>();
  for (const edge of tree.edges) {
    const list = children.get(edge.from) ?? [];
    list.push(edge.to);
    children.set(edge.from, list);
  }

  const rankOf = new Map<string, number>();
  const orderInRank = new Map<number, string[]>();
  const visit = (id: string, rank: number) => {
    if (rankOf.has(id)) return;
    rankOf.set(id, rank);
    const bucket = orderInRank.get(rank) ?? [];
    bucket.push(id);
    orderInRank.set(rank, bucket);
    for (const child of children.get(id) ?? []) {
      visit(child, rank + 1);
    }
  };
  visit("root", 0);

  const nodeW = 140;
  const nodeH = 44;
  const rankGap = 56;
  const nodeGap = 14;
  const pad = 16;

  const nodes: MindLayoutNode[] = [];
  const pos = new Map<string, { x: number; y: number }>();
  let maxRank = 0;
  for (const [rank, ids] of orderInRank) {
    maxRank = Math.max(maxRank, rank);
    ids.forEach((id, index) => {
      const meta = tree.nodes.find((n) => n.id === id);
      if (!meta) return;
      const x = pad + rank * (nodeW + rankGap);
      const y = pad + index * (nodeH + nodeGap);
      pos.set(id, { x, y });
      nodes.push({ ...meta, x, y, rank });
    });
  }

  const edges = tree.edges.map((edge) => {
    const a = pos.get(edge.from) ?? { x: 0, y: 0 };
    const b = pos.get(edge.to) ?? { x: 0, y: 0 };
    return {
      ...edge,
      x1: a.x + nodeW,
      y1: a.y + nodeH / 2,
      x2: b.x,
      y2: b.y + nodeH / 2,
    };
  });

  const height =
    pad * 2 +
    Math.max(
      ...[...orderInRank.values()].map((ids) => ids.length * (nodeH + nodeGap) - nodeGap),
      nodeH,
    );
  const width = pad * 2 + (maxRank + 1) * nodeW + maxRank * rankGap;

  return { nodes, edges, width, height };
}
