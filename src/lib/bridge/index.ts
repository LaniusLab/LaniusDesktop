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
  FlowDangerousStep,
  FlowInspectResult,
  FlowNodeRun,
  FlowRunResult,
  FlowValidateResult,
  FlowValidationIssue,
  LogLevel,
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
export type {
  SecretDeleteResult,
  SecretGetResult,
  SecretListResult,
  SecretSetResult,
} from "@/lib/gen/shell-secret";
export type {
  DriverElementFindParams,
  DriverElementFindResult,
  Locator,
} from "@/lib/gen/element-locator";
export type {
  TrustCheckResult,
  TrustListResult,
  TrustMarkResult,
  TrustRevokeResult,
} from "@/lib/gen/shell-trust";
