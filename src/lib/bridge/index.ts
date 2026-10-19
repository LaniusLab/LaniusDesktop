import { createMockBridge } from "./mock";
import { createTauriBridge } from "./tauri";
import type { Bridge } from "./types";

// Tauri 运行时注入的全局标记；浏览器开发时走 mock，保证 pnpm dev 可独立预览
const isTauri = "__TAURI_INTERNALS__" in window;

export const bridge: Bridge = isTauri ? createTauriBridge() : createMockBridge();

export { isTauri };
export { normalizeEngineEvent } from "./normalize-engine-event";
export type {
  Bridge,
  EngineEvent,
  EngineInfo,
  EngineStatus,
  ExecutionPhase,
  FlowNodeRun,
  FlowRunResult,
  UpdaterResult,
  UpdaterStatus,
} from "./types";
export type {
  UpdaterApplyResult,
  UpdaterCheckResult,
  UpdaterDownloadResult,
  UpdaterInstallResult,
  UpdaterListResult,
  UpdaterProgress,
  UpdaterRelease,
  UpdaterReleaseAsset,
} from "@/lib/gen/shell-updater";
