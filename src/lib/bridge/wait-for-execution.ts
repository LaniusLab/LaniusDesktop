import type { ExecutionPhase, FlowNodeRun, FlowRunResult } from "./types";

const TERMINAL: ReadonlySet<ExecutionPhase> = new Set([
  "done",
  "failed",
  "cancelled",
]);

export function isTerminalPhase(phase: ExecutionPhase | undefined): boolean {
  return phase !== undefined && TERMINAL.has(phase);
}

/** execution.get 记录 → FlowRunResult */
export function recordToFlowRunResult(record: Record<string, unknown>): FlowRunResult {
  const nodeRunsRaw = Array.isArray(record.nodeRuns) ? record.nodeRuns : [];
  const nodeRuns: FlowNodeRun[] = nodeRunsRaw.map((raw) => {
    const row = raw as Record<string, unknown>;
    const status = row.status;
    return {
      nodeId: String(row.nodeId ?? ""),
      status:
        status === "done" ||
        status === "failed" ||
        status === "cancelled" ||
        status === "skipped"
          ? status
          : "done",
      durationMs: typeof row.durationMs === "number" ? row.durationMs : 0,
      errorCode: typeof row.errorCode === "string" ? row.errorCode : null,
      label: typeof row.label === "string" ? row.label : undefined,
    };
  });
  const errorRaw = record.error;
  const error =
    errorRaw !== null && typeof errorRaw === "object"
      ? {
          code: String((errorRaw as Record<string, unknown>).code ?? ""),
          message: String((errorRaw as Record<string, unknown>).message ?? ""),
        }
      : null;
  const state = record.state;
  const finalState: ExecutionPhase | undefined =
    state === "done" ||
    state === "failed" ||
    state === "cancelled" ||
    state === "paused" ||
    state === "running" ||
    state === "validating" ||
    state === "idle"
      ? state
      : undefined;
  return {
    executionId: String(record.executionId ?? ""),
    finalState,
    mode: record.mode === "dryRun" ? "dryRun" : "run",
    nodeRuns,
    error,
  };
}

/**
 * 订阅终态事件 + execution.get，把异步 flow.start 补成完整 FlowRunResult。
 * 先挂监听再 start，避免极短流程丢终态。
 */
export async function waitForExecutionResult(options: {
  executionId: string;
  alreadyTerminal?: ExecutionPhase;
  watchTerminal: (handler: (phase: ExecutionPhase, executionId: string) => void) => () => void;
  fetchRecord: (executionId: string) => Promise<Record<string, unknown>>;
  timeoutMs?: number;
}): Promise<FlowRunResult> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  let terminal = options.alreadyTerminal;
  let stopWatch = () => {};

  const terminalPromise = new Promise<ExecutionPhase>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`等待执行结束超时: ${options.executionId}`));
    }, timeoutMs);
    stopWatch = options.watchTerminal((phase, executionId) => {
      if (executionId !== options.executionId) return;
      if (!isTerminalPhase(phase)) return;
      clearTimeout(timer);
      resolve(phase);
    });
    if (terminal && isTerminalPhase(terminal)) {
      clearTimeout(timer);
      resolve(terminal);
    }
  });

  try {
    if (!terminal || !isTerminalPhase(terminal)) {
      terminal = await terminalPromise;
    }
  } finally {
    stopWatch();
  }

  try {
    const record = await options.fetchRecord(options.executionId);
    return recordToFlowRunResult(record);
  } catch {
    return { executionId: options.executionId, finalState: terminal };
  }
}
