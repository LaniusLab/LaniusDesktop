import type { EngineEvent, ExecutionPhase, LogLevel } from "./types";

/**
 * 把壳转发的原始帧归一成 UI 的 EngineEvent。
 * - 壳状态帧：`{ kind: "status", … }`（已是目标形状）
 * - 引擎 JSON-RPC 通知：`{ jsonrpc, method, params }`（PROTOCOL.md §3.3）
 * 独立文件以便与 in-app-updater 等并行分支减少冲突。
 */
export function normalizeEngineEvent(raw: unknown): EngineEvent | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }
  const frame = raw as Record<string, unknown>;

  if (typeof frame.kind === "string") {
    return frame as unknown as EngineEvent;
  }

  const method = typeof frame.method === "string" ? frame.method : null;
  const params =
    frame.params !== null && typeof frame.params === "object"
      ? (frame.params as Record<string, unknown>)
      : {};

  if (!method) {
    return null;
  }

  const executionId = asString(params.executionId);
  const traceId = asString(params.traceId);
  const nodeId = asString(params.nodeId);

  switch (method) {
    case "execution.stateChanged": {
      const phase = asPhase(params.to);
      if (!phase) return null;
      return { kind: "execution", executionId, phase, traceId };
    }
    case "execution.nodeStarted":
      return {
        kind: "execution",
        executionId,
        phase: "running",
        nodeId,
        nodeStatus: "running",
        traceId,
      };
    case "execution.nodeFinished": {
      const status = asNodeStatus(params.status);
      return {
        kind: "execution",
        executionId,
        phase: "running",
        nodeId,
        nodeStatus: status ?? "done",
        traceId,
        message: asString(params.message),
      };
    }
    case "execution.log":
      return {
        kind: "log",
        executionId,
        traceId,
        nodeId,
        message: asString(params.message) ?? "",
        level: asLogLevel(params.level),
      };
    case "execution.targetBound":
      return {
        kind: "log",
        executionId,
        traceId,
        message: `bound ${asString(params.handle) ?? "window"}`,
      };
    case "engine.heartbeat":
      return {
        kind: "status",
        status: "ready",
        uptimeMs: typeof params.uptimeMs === "number" ? params.uptimeMs : undefined,
        message:
          typeof params.activeExecutions === "number"
            ? `active=${params.activeExecutions}`
            : undefined,
      };
    default:
      return null;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asLogLevel(value: unknown): LogLevel | undefined {
  if (typeof value !== "string") return undefined;
  switch (value) {
    case "debug":
    case "info":
    case "warning":
    case "error":
      return value;
    case "warn":
      return "warning";
    default:
      return undefined;
  }
}

function asPhase(value: unknown): ExecutionPhase | undefined {
  if (typeof value !== "string") return undefined;
  switch (value) {
    case "idle":
    case "validating":
    case "running":
    case "paused":
    case "done":
    case "failed":
    case "cancelled":
      return value;
    default:
      return undefined;
  }
}

function asNodeStatus(
  value: unknown,
): "running" | "done" | "failed" | "skipped" | undefined {
  if (typeof value !== "string") return undefined;
  switch (value) {
    case "running":
    case "done":
    case "failed":
    case "skipped":
      return value;
    default:
      return undefined;
  }
}
