import type { FlowNodeRun } from "@/lib/bridge";

/** 预演与真实运行逐步对照行（同构轨迹验收用）。 */
export interface TrajectoryRow {
  nodeId: string;
  label?: string;
  dryStatus?: FlowNodeRun["status"];
  runStatus?: FlowNodeRun["status"];
  /** 两侧都有且 status 一致 */
  match: boolean;
}

export interface TrajectoryCompare {
  rows: TrajectoryRow[];
  /** 步骤 id 序列一致（顺序与集合） */
  structureMatch: boolean;
  /** 每步 status 都一致 */
  statusMatch: boolean;
}

/**
 * 按 nodeId 对齐预演与真实轨迹。
 * 以两侧出现的顺序并集展开：先预演序，再补真实独有步骤。
 */
export function compareTrajectories(
  dryRuns: FlowNodeRun[] | undefined,
  realRuns: FlowNodeRun[] | undefined,
): TrajectoryCompare {
  const dry = dryRuns ?? [];
  const real = realRuns ?? [];
  const dryMap = new Map(dry.map((row) => [row.nodeId, row]));
  const realMap = new Map(real.map((row) => [row.nodeId, row]));

  const order: string[] = [];
  for (const row of dry) {
    if (!order.includes(row.nodeId)) order.push(row.nodeId);
  }
  for (const row of real) {
    if (!order.includes(row.nodeId)) order.push(row.nodeId);
  }

  const dryIds = dry.map((row) => row.nodeId);
  const realIds = real.map((row) => row.nodeId);
  const structureMatch =
    dryIds.length === realIds.length && dryIds.every((id, index) => id === realIds[index]);

  const rows: TrajectoryRow[] = order.map((nodeId) => {
    const d = dryMap.get(nodeId);
    const r = realMap.get(nodeId);
    const match = Boolean(d && r && d.status === r.status);
    return {
      nodeId,
      label: d?.label ?? r?.label,
      dryStatus: d?.status,
      runStatus: r?.status,
      match,
    };
  });

  const statusMatch = structureMatch && rows.length > 0 && rows.every((row) => row.match);

  return { rows, structureMatch, statusMatch };
}

/** 在 runs（新→旧）里找最近一次预演与最近一次真实运行。 */
export function pickLatestDryAndRun<T extends { mode: "run" | "dryRun" }>(
  runs: T[],
): { dry?: T; real?: T } {
  const dry = runs.find((run) => run.mode === "dryRun");
  const real = runs.find((run) => run.mode === "run");
  return { dry, real };
}
