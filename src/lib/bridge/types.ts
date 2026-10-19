// 桥接层共享类型。跨层载荷类型以 src/lib/gen（schema codegen 产物）为准，
// 本文件只保留桥接自身的元类型。

import type { ShellDebugInfo } from "@/lib/gen/shell-debug";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";
import type {
  UpdaterCheckResult,
  UpdaterDownloadResult,
  UpdaterInstallResult,
  UpdaterListResult,
  UpdaterProgress,
} from "@/lib/gen/shell-updater";
import type { FlowFile } from "@/lib/gen/flow";

export type EngineStatus = "starting" | "ready" | "degraded" | "stopped";

export interface EngineInfo {
  protocolVersion: string;
  engineVersion: string;
  capabilities: string[];
  nodeTypes: string[];
}

export type ExecutionPhase =
  | "idle"
  | "validating"
  | "running"
  | "paused"
  | "done"
  | "failed"
  | "cancelled";

export interface FlowNodeRun {
  nodeId: string;
  status: "done" | "failed" | "cancelled" | "skipped";
  durationMs: number;
  errorCode?: string | null;
  label?: string;
}

export interface FlowRunResult {
  executionId: string;
  finalState?: ExecutionPhase;
  mode?: "run" | "dryRun";
  nodeRuns?: FlowNodeRun[];
  error?: { code?: string; message?: string } | null;
}

export interface EngineEvent {
  kind: "status" | "execution" | "log";
  status?: EngineStatus;
  executionId?: string;
  phase?: ExecutionPhase;
  nodeId?: string;
  nodeStatus?: "running" | "done" | "failed" | "skipped";
  traceId?: string;
  message?: string;
  uptimeMs?: number;
}

/** @deprecated 使用 UpdaterCheckResult；保留别名以免旧引用断裂 */
export type UpdaterResult = UpdaterCheckResult;
export type UpdaterStatus = UpdaterCheckResult["status"];

export interface Bridge {
  engineInfo(): Promise<EngineInfo>;
  flowRun(flow: FlowFile, mode: "run" | "dryRun"): Promise<FlowRunResult>;
  flowCancel(executionId: string): Promise<void>;
  onEngineEvent(handler: (event: EngineEvent) => void): () => void;
  prefsGet(): Promise<ShellPrefs>;
  prefsSet(prefs: ShellPrefs): Promise<ShellPrefs>;
  debugInfo(): Promise<ShellDebugInfo>;
  logsTail(): Promise<string>;
  updaterList(): Promise<UpdaterListResult>;
  updaterCheck(): Promise<UpdaterCheckResult>;
  updaterDownload(tag: string): Promise<UpdaterDownloadResult>;
  updaterInstall(path: string): Promise<UpdaterInstallResult>;
  onUpdaterProgress(handler: (event: UpdaterProgress) => void): () => void;
  windowMinimize(): Promise<void>;
  windowToggleMaximize(): Promise<void>;
  windowIsMaximized(): Promise<boolean>;
  windowClose(): Promise<void>;
}
