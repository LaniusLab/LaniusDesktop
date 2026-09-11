import { create } from "zustand";

import type { EngineStatus, ExecutionPhase } from "@/lib/bridge";

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
}));
