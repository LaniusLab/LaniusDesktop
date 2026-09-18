import { create } from "zustand";

import type { EngineStatus, ExecutionPhase, FlowRunResult } from "@/lib/bridge";

interface LogLine {
  ts: number;
  message: string;
  traceId?: string;
}

interface ExecutionState {
  engineStatus: EngineStatus;
  engineUptimeMs: number;
  phase: ExecutionPhase;
  activeExecutionId?: string;
  lastTraceId?: string;
  logLines: LogLine[];
  setEngineStatus: (status: EngineStatus, uptimeMs?: number) => void;
  setPhase: (phase: ExecutionPhase, executionId?: string, traceId?: string) => void;
  appendLog: (line: LogLine) => void;
  ingestRunResult: (result: FlowRunResult) => void;
}

const MAX_LOG_LINES = 500;

export const useExecutionStore = create<ExecutionState>()((set) => ({
  engineStatus: "starting",
  engineUptimeMs: 0,
  phase: "idle",
  logLines: [],
  setEngineStatus: (status, uptimeMs) =>
    set((s) => ({ engineStatus: status, engineUptimeMs: uptimeMs ?? s.engineUptimeMs })),
  setPhase: (phase, executionId, traceId) =>
    set((s) => ({
      phase,
      activeExecutionId: executionId ?? s.activeExecutionId,
      lastTraceId: traceId ?? s.lastTraceId,
    })),
  appendLog: (line) =>
    set((s) => ({ logLines: [...s.logLines.slice(-MAX_LOG_LINES + 1), line] })),
  ingestRunResult: (result) =>
    set((s) => {
      if (!result.finalState) return s;
      const extra: LogLine[] = [];
      for (const run of result.nodeRuns ?? []) {
        const name = run.label || run.nodeId;
        const suffix =
          run.status === "skipped" ? "跳过" : run.status === "done" ? "完成" : run.status;
        extra.push({ ts: Date.now(), message: `${name}：${suffix}` });
      }
      if (result.error?.message || result.error?.code) {
        extra.push({
          ts: Date.now(),
          message: result.error.message ?? result.error.code ?? "执行失败",
        });
      }
      return {
        phase: result.finalState,
        activeExecutionId: result.executionId,
        logLines: [...s.logLines.slice(-MAX_LOG_LINES + 1), ...extra],
      };
    }),
}));
