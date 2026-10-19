import { create } from "zustand";

import type {
  EngineStatus,
  ExecutionPhase,
  FlowNodeRun,
  FlowRunResult,
  LogLevel,
} from "@/lib/bridge";

export type StepRunStatus = "pending" | "running" | "done" | "failed" | "skipped" | "cancelled";

export interface LogLine {
  ts: number;
  message: string;
  level?: LogLevel;
  traceId?: string;
  executionId?: string;
  nodeId?: string;
}

export interface RunRecord {
  executionId: string;
  startedAt: number;
  mode: "run" | "dryRun";
  finalState: ExecutionPhase;
  exe: string;
  channel: string;
  doneCount: number;
  skippedCount: number;
  failedCount: number;
  /** 首个失败步骤，供历史页跳回模板 */
  failedStepId?: string;
  traceId?: string;
  errorMessage?: string;
  /** 逐步轨迹，供预演↔真实对照 */
  nodeRuns?: FlowNodeRun[];
}

interface BeginRunInput {
  mode: "run" | "dryRun";
  exe: string;
  channel: string;
  steps: Array<{ id: string; disabled?: boolean }>;
}

interface ExecutionState {
  engineStatus: EngineStatus;
  engineUptimeMs: number;
  phase: ExecutionPhase;
  activeExecutionId?: string;
  lastTraceId?: string;
  activeStepId?: string;
  stepStatuses: Record<string, StepRunStatus>;
  logLines: LogLine[];
  runs: RunRecord[];
  pendingRun?: Omit<
    RunRecord,
    | "finalState"
    | "doneCount"
    | "skippedCount"
    | "failedCount"
    | "failedStepId"
    | "errorMessage"
    | "nodeRuns"
  >;
  setEngineStatus: (status: EngineStatus, uptimeMs?: number) => void;
  setPhase: (phase: ExecutionPhase, executionId?: string, traceId?: string) => void;
  noteStep: (nodeId: string, status: StepRunStatus) => void;
  appendLog: (line: LogLine) => void;
  beginRun: (input: BeginRunInput) => void;
  ingestRunResult: (result: FlowRunResult) => void;
}

const MAX_LOG_LINES = 500;
const MAX_RUNS = 50;

function levelForStatus(status: string): LogLevel {
  if (status === "failed") return "error";
  if (status === "skipped" || status === "cancelled") return "warning";
  return "info";
}

export const useExecutionStore = create<ExecutionState>()((set) => ({
  engineStatus: "starting",
  engineUptimeMs: 0,
  phase: "idle",
  logLines: [],
  runs: [],
  stepStatuses: {},
  setEngineStatus: (status, uptimeMs) =>
    set((s) => ({ engineStatus: status, engineUptimeMs: uptimeMs ?? s.engineUptimeMs })),
  setPhase: (phase, executionId, traceId) =>
    set((s) => ({
      phase,
      activeExecutionId: executionId ?? s.activeExecutionId,
      lastTraceId: traceId ?? s.lastTraceId,
      activeStepId: phase === "idle" || phase === "done" || phase === "failed" ? undefined : s.activeStepId,
    })),
  noteStep: (nodeId, status) =>
    set((s) => ({
      activeStepId: status === "running" ? nodeId : s.activeStepId,
      stepStatuses: { ...s.stepStatuses, [nodeId]: status },
    })),
  appendLog: (line) =>
    set((s) => ({ logLines: [...s.logLines.slice(-MAX_LOG_LINES + 1), line] })),
  beginRun: (input) => {
    const stepStatuses: Record<string, StepRunStatus> = {};
    for (const step of input.steps) {
      stepStatuses[step.id] = step.disabled ? "skipped" : "pending";
    }
    set((s) => ({
      phase: "validating",
      activeExecutionId: undefined,
      activeStepId: undefined,
      stepStatuses,
      pendingRun: {
        executionId: "",
        startedAt: Date.now(),
        mode: input.mode,
        exe: input.exe,
        channel: input.channel,
      },
      logLines: s.logLines,
    }));
  },
  ingestRunResult: (result) =>
    set((s) => {
      if (!result.executionId) return s;
      const nodeRuns = result.nodeRuns ?? [];
      const stepStatuses: Record<string, StepRunStatus> = { ...s.stepStatuses };
      const extra: LogLine[] = [];
      const alreadyLogged = s.logLines.some((line) => line.executionId === result.executionId);
      let failedStepId: string | undefined;
      for (const run of nodeRuns) {
        stepStatuses[run.nodeId] = run.status;
        if (run.status === "failed" && !failedStepId) {
          failedStepId = run.nodeId;
        }
        if (alreadyLogged) continue;
        const name = run.label || run.nodeId;
        const suffix =
          run.status === "skipped"
            ? "跳过"
            : run.status === "done"
              ? "完成"
              : run.status === "failed"
                ? "失败"
                : run.status;
        extra.push({
          ts: Date.now(),
          message: `${name}：${suffix}`,
          executionId: result.executionId,
          nodeId: run.nodeId,
          level: levelForStatus(run.status),
          traceId: s.lastTraceId,
        });
      }
      if (result.error?.message || result.error?.code) {
        extra.push({
          ts: Date.now(),
          message: result.error.message ?? result.error.code ?? "执行失败",
          executionId: result.executionId,
          level: "error",
          traceId: s.lastTraceId,
        });
      }
      const finalState = result.finalState ?? s.phase;
      const doneCount = nodeRuns.filter((run) => run.status === "done").length;
      const skippedCount = nodeRuns.filter((run) => run.status === "skipped").length;
      const failedCount = nodeRuns.filter((run) => run.status === "failed").length;
      const record: RunRecord = {
        executionId: result.executionId,
        startedAt: s.pendingRun?.startedAt ?? Date.now(),
        mode: result.mode ?? s.pendingRun?.mode ?? "run",
        finalState,
        exe: s.pendingRun?.exe ?? "",
        channel: s.pendingRun?.channel ?? "",
        doneCount,
        skippedCount,
        failedCount,
        failedStepId,
        traceId: s.lastTraceId,
        errorMessage: result.error?.message ?? result.error?.code ?? undefined,
        nodeRuns: nodeRuns.length > 0 ? nodeRuns : undefined,
      };
      return {
        phase: finalState,
        activeExecutionId: result.executionId,
        activeStepId: undefined,
        stepStatuses,
        pendingRun: undefined,
        runs: [record, ...s.runs].slice(0, MAX_RUNS),
        logLines: extra.length > 0 ? [...s.logLines.slice(-MAX_LOG_LINES + extra.length), ...extra] : s.logLines,
      };
    }),
}));
