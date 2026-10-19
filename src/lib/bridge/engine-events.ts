import type { EngineEvent, ExecutionPhase } from "./types";

type NodeStatus = NonNullable<EngineEvent["nodeStatus"]>;

/** 壳侧 status 事件或引擎 JSON-RPC 通知帧 → UI EngineEvent。 */
export function normalizeEngineEvent(payload: unknown): EngineEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const frame = payload as Record<string, unknown>;

  if (typeof frame.kind === "string") {
    return frame as unknown as EngineEvent;
  }

  const method = typeof frame.method === "string" ? frame.method : "";
  const params =
    frame.params && typeof frame.params === "object"
      ? (frame.params as Record<string, unknown>)
      : {};
  const executionId = str(params.executionId);
  const traceId = str(params.traceId) || undefined;

  if (method === "execution.stateChanged") {
    const phase = asPhase(params.to);
    if (!phase) return null;
    return { kind: "execution", executionId, phase, traceId };
  }

  if (method === "execution.nodeStarted") {
    const nodeId = str(params.nodeId);
    if (!nodeId) return null;
    return {
      kind: "execution",
      executionId,
      phase: "running",
      nodeId,
      nodeStatus: "running",
      traceId,
    };
  }

  if (method === "execution.nodeFinished") {
    const nodeId = str(params.nodeId);
    const nodeStatus = asNodeStatus(params.status);
    if (!nodeId || !nodeStatus) return null;
    return {
      kind: "execution",
      executionId,
      phase: "running",
      nodeId,
      nodeStatus,
      traceId,
    };
  }

  if (method === "execution.log") {
    const message = str(params.message);
    if (!message) return null;
    return {
      kind: "log",
      executionId,
      traceId,
      nodeId: str(params.nodeId) || undefined,
      message,
    };
  }

  if (method === "engine.heartbeat") {
    return {
      kind: "status",
      status: "ready",
      uptimeMs: typeof params.uptimeMs === "number" ? params.uptimeMs : undefined,
    };
  }

  return null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asPhase(value: unknown): ExecutionPhase | null {
  if (typeof value !== "string") return null;
  const allowed: ExecutionPhase[] = [
    "idle",
    "validating",
    "running",
    "paused",
    "done",
    "failed",
    "cancelled",
  ];
  return (allowed as string[]).includes(value) ? (value as ExecutionPhase) : null;
}

function asNodeStatus(value: unknown): NodeStatus | null {
  if (typeof value !== "string") return null;
  const allowed: NodeStatus[] = ["running", "done", "failed", "skipped"];
  return (allowed as string[]).includes(value) ? (value as NodeStatus) : null;
}
