import { DEFAULT_PREFS, mergePrefs } from "@/lib/prefs";
import type { FlowFile } from "@/lib/gen/flow";
import type { ShellDebugInfo } from "@/lib/gen/shell-debug";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";
import type {
  Bridge,
  EngineEvent,
  EngineInfo,
  FlowNodeRun,
  FlowValidationIssue,
  FlowValidateResult,
} from "./types";

const mockSecrets = new Map<string, string>();
/** key = `${flowId}::${contentHash}` */
const mockTrust = new Map<string, number>();

const MOCK_SCHEMA_VERSION = 3;

/*
 * 浏览器开发 mock：pnpm dev 脱离 Tauri 运行时，用定时器模拟
 * 引擎心跳与一次执行的状态机流转，保证 UI 在纯浏览器里可开发。
 * 真实实现见 tauri.ts，两者必须保持同一 Bridge 契约。
 */

const MOCK_INFO: EngineInfo = {
  protocolVersion: "0.1.0",
  engineVersion: "0.1.0-mock",
  capabilities: ["dryRun", "template.steps", "locate.a11y", "driver.elementFind"],
  nodeTypes: [
    "core.log",
    "core.wait",
    "keyboard.press",
    "keyboard.type",
    "mouse.click",
    "mouse.dblclick",
    "mouse.move",
  ],
};

const MOCK_KNOWN_TYPES = new Set([
  ...MOCK_INFO.nodeTypes,
  "flow.if",
  "flow.loop",
  "flow.wait",
  "flow.subflow",
  "flow.tryCatch",
]);

function validateMockFlow(flow: FlowFile): FlowValidateResult {
  const issues: FlowValidationIssue[] = [];
  const walk = (steps: NonNullable<FlowFile["steps"]>) => {
    for (const step of steps) {
      const nodeType = step.type ?? (step.kind === "binding" ? "keyboard.press" : "");
      if (!nodeType || !MOCK_KNOWN_TYPES.has(nodeType)) {
        issues.push({
          severity: "error",
          code: "engine.flow.unknownNodeType",
          nodeId: step.id,
          message: `未知节点类型: ${nodeType || step.kind}`,
        });
      } else if (step.kind === "binding") {
        const keys = String(step.keys ?? step.config?.keys ?? "").trim();
        if (!keys) {
          issues.push({
            severity: "error",
            code: "engine.flow.validationFailed",
            nodeId: step.id,
            message: "缺按键。在右侧「发出的键」里补上。",
          });
        }
      }
      if (nodeType === "core.wait") {
        const ms = step.config?.ms;
        if (typeof ms === "number" && ms < 0) {
          issues.push({
            severity: "error",
            code: "engine.flow.validationFailed",
            nodeId: step.id,
            message: "等待时间不能是负数。",
          });
        }
      }
      if (nodeType === "keyboard.type") {
        const text = String(step.config?.text ?? "").trim();
        if (!text) {
          issues.push({
            severity: "error",
            code: "engine.flow.validationFailed",
            nodeId: step.id,
            message: "文本内容不能为空。",
          });
        }
      }
      if (step.then) walk(step.then);
      if (step.else) walk(step.else);
      if (step.body) walk(step.body);
    }
  };
  walk(flow.steps ?? []);
  return { ok: !issues.some((issue) => issue.severity === "error"), issues };
}

function bumpMockFlow(flow: FlowFile): { flow: FlowFile; migratedFrom: number; migratedTo: number } {
  const migratedFrom = flow.schemaVersion;
  const migratedTo = Math.max(migratedFrom, MOCK_SCHEMA_VERSION);
  return {
    flow: { ...flow, schemaVersion: migratedTo },
    migratedFrom,
    migratedTo,
  };
}

const MOCK_DEBUG: ShellDebugInfo = {
  appVersion: "0.1.0",
  os: "browser",
  arch: "unknown",
  family: "unknown",
  autostartSupported: false,
  paths: {
    configDir: "(browser)",
    dataDir: "(browser)",
    logDir: "(browser)",
    logFile: "(browser)",
    exePath: "(browser)",
  },
};

/** 浏览器开发 mock：定时器模拟引擎心跳与一次执行流转；与 tauri.ts 保持同一 Bridge 契约。 */
export function createMockBridge(): Bridge {
  const handlers = new Set<(event: EngineEvent) => void>();
  const emit = (event: EngineEvent) => handlers.forEach((h) => h(event));
  let prefs: ShellPrefs = { ...DEFAULT_PREFS };
  const files = new Map<string, FlowFile>();

  let uptime = 0;
  let traceSeq = 0;
  /** 当前 mock 执行的协作式暂停/取消门闩 */
  let activeRun:
    | {
        executionId: string;
        traceId: string;
        cancelled: boolean;
        paused: boolean;
        resumeWaiters: Array<() => void>;
      }
    | undefined;

  const tick = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const waitIfPaused = async () => {
    const run = activeRun;
    if (!run || !run.paused || run.cancelled) return;
    await new Promise<void>((resolve) => {
      run.resumeWaiters.push(resolve);
    });
  };

  setTimeout(() => emit({ kind: "status", status: "ready" }), 600);
  setInterval(() => {
    uptime += 5000;
    emit({ kind: "status", status: "ready", uptimeMs: uptime });
  }, 5000);

  return {
    async engineInfo() {
      return MOCK_INFO;
    },

    async flowRun(flow, mode) {
      const executionId = `mock-exec-${++traceSeq}`;
      const traceId = `mock-trace-${traceSeq.toString().padStart(4, "0")}`;
      const steps = flow.steps ?? [];
      const exe = flow.target?.match?.exe || "window";
      const channel = flow.target?.locate?.channel === "vision" ? "画面" : "控件";
      const prefix = mode === "dryRun" ? "演练：" : "";
      activeRun = {
        executionId,
        traceId,
        cancelled: false,
        paused: false,
        resumeWaiters: [],
      };

      emit({ kind: "execution", executionId, phase: "validating", traceId });
      await tick(40);
      if (activeRun?.cancelled) {
        emit({ kind: "execution", executionId, phase: "cancelled", traceId });
        activeRun = undefined;
        return { executionId, finalState: "cancelled", mode, nodeRuns: [] };
      }
      emit({ kind: "execution", executionId, phase: "running", traceId });
      emit({
        kind: "log",
        executionId,
        traceId,
        message: `${prefix}绑定 ${exe}（${channel}）`,
      });

      const nodeRuns: FlowNodeRun[] = [];
      for (const step of steps) {
        await waitIfPaused();
        if (activeRun?.cancelled) {
          emit({ kind: "execution", executionId, phase: "cancelled", traceId });
          activeRun = undefined;
          return { executionId, finalState: "cancelled", mode, nodeRuns };
        }
        if (step.disabled) {
          nodeRuns.push({
            nodeId: step.id,
            status: "skipped" as const,
            durationMs: 0,
            label: step.label,
          });
          emit({
            kind: "execution",
            executionId,
            phase: "running",
            nodeId: step.id,
            nodeStatus: "skipped",
            traceId,
          });
          continue;
        }
        emit({
          kind: "execution",
          executionId,
          phase: "running",
          nodeId: step.id,
          nodeStatus: "running",
          traceId,
        });
        await tick(80);
        await waitIfPaused();
        if (activeRun?.cancelled) {
          nodeRuns.push({
            nodeId: step.id,
            status: "cancelled",
            durationMs: 0,
            label: step.label,
          });
          emit({ kind: "execution", executionId, phase: "cancelled", traceId });
          activeRun = undefined;
          return { executionId, finalState: "cancelled", mode, nodeRuns };
        }
        emit({
          kind: "log",
          executionId,
          traceId,
          nodeId: step.id,
          message: `${prefix}${step.label ?? step.id}`,
        });
        emit({
          kind: "execution",
          executionId,
          phase: "running",
          nodeId: step.id,
          nodeStatus: "done",
          traceId,
        });
        nodeRuns.push({
          nodeId: step.id,
          status: "done" as const,
          durationMs: 80,
          label: step.label,
        });
      }
      emit({ kind: "execution", executionId, phase: "done", traceId });
      await tick(20);
      emit({ kind: "execution", executionId, phase: "idle", traceId });
      activeRun = undefined;
      return { executionId, finalState: "done", mode, nodeRuns };
    },

    async flowCancel(executionId) {
      if (!activeRun || activeRun.executionId !== executionId) return;
      activeRun.cancelled = true;
      activeRun.paused = false;
      for (const wake of activeRun.resumeWaiters) wake();
      activeRun.resumeWaiters = [];
    },

    async flowPause(executionId) {
      if (!activeRun || activeRun.executionId !== executionId) return;
      activeRun.paused = true;
      emit({
        kind: "execution",
        executionId,
        phase: "paused",
        traceId: activeRun.traceId,
      });
    },

    async flowResume(executionId) {
      if (!activeRun || activeRun.executionId !== executionId) return;
      activeRun.paused = false;
      emit({
        kind: "execution",
        executionId,
        phase: "running",
        traceId: activeRun.traceId,
      });
      for (const wake of activeRun.resumeWaiters) wake();
      activeRun.resumeWaiters = [];
    },

    async flowOpen(path) {
      const trimmed = path.trim();
      if (!trimmed) {
        throw new Error("flow_open 需要 path");
      }
      const stored = files.get(trimmed);
      if (stored) {
        const migrated = bumpMockFlow(stored);
        return { path: trimmed, ...migrated };
      }
      // 浏览器无本机盘；未写入过的路径给出可编辑空模板，便于开发联调
      const empty: FlowFile = {
        schemaVersion: MOCK_SCHEMA_VERSION,
        id: `mock-${trimmed.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32)}`,
        name: trimmed.split(/[/\\]/).pop() ?? "未命名",
        steps: [],
      };
      return { path: trimmed, flow: empty, migratedFrom: MOCK_SCHEMA_VERSION, migratedTo: MOCK_SCHEMA_VERSION };
    },

    async flowSave(path, flow) {
      const trimmed = path.trim();
      if (!trimmed) {
        throw new Error("flow_save 需要 path");
      }
      if (!Array.isArray(flow.steps)) {
        throw new Error("flow 缺少 steps 数组");
      }
      files.set(trimmed, flow);
      return { path: trimmed };
    },

    async flowValidate(flow) {
      return validateMockFlow(flow);
    },

    async flowInspect(flow) {
      const steps = flow.steps ?? [];
      const dangerousSteps: Array<{
        nodeId: string;
        type: string;
        dangerLevel: string;
        label: string;
      }> = [];
      const walk = (items: typeof steps) => {
        for (const step of items) {
          if (step.disabled) continue;
          const nodeType = step.type ?? "";
          if (nodeType === "fs.writeText") {
            dangerousSteps.push({
              nodeId: step.id,
              type: nodeType,
              dangerLevel: "destructive",
              label: step.label ?? step.id,
            });
          }
          if (step.then) walk(step.then);
          if (step.else) walk(step.else);
          if (step.body) walk(step.body);
          if (step.catch) walk(step.catch);
        }
      };
      walk(steps);
      const payload = JSON.stringify(flow);
      let hash = 0;
      for (let i = 0; i < payload.length; i += 1) {
        hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
      }
      const contentHash = hash.toString(16).padStart(64, "0").slice(0, 64);
      return {
        flowId: flow.id,
        contentHash,
        dangerousSteps,
      };
    },

    async elementFind(params) {
      const match = params.match ?? {};
      const locator = params.locator ?? {};
      const name = String(locator.name ?? "").trim();
      const automationId = String(locator.automationId ?? "").trim();
      const controlType = String(locator.controlType ?? "").trim();
      if (!name && !automationId && !controlType) {
        throw new Error("locator 至少填写一项");
      }
      if (!match.exe && !match.title && !match.className) {
        throw new Error("match 至少填写一项");
      }
      return {
        found: true,
        handle: "hwnd-mock",
        elementId: "el-mock",
        summary: { name, automationId, controlType },
      };
    },

    onEngineEvent(handler) {
      handlers.add(handler);
      handler({ kind: "status", status: "starting" });
      return () => handlers.delete(handler);
    },

    async prefsGet() {
      return prefs;
    },

    async prefsSet(next) {
      prefs = mergePrefs(next);
      return prefs;
    },

    async secretList() {
      return { keys: [...mockSecrets.keys()].sort() };
    },

    async secretSet(key, value) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(key) || !value) {
        throw new Error("invalid secret");
      }
      mockSecrets.set(key, value);
      return { key };
    },

    async secretGet(key) {
      const value = mockSecrets.get(key);
      return value === undefined
        ? { key, found: false, value: null }
        : { key, found: true, value };
    },

    async secretDelete(key) {
      const removed = mockSecrets.delete(key);
      return { key, removed };
    },

    async trustList() {
      const records = [...mockTrust.entries()].map(([key, trustedAt]) => {
        const [flowId = "", contentHash = ""] = key.split("::");
        return { flowId, contentHash, trustedAt };
      });
      return { records };
    },

    async trustCheck(flowId, contentHash) {
      const key = `${flowId}::${contentHash}`;
      const trustedAt = mockTrust.get(key);
      return {
        flowId,
        contentHash,
        trusted: trustedAt !== undefined,
        trustedAt: trustedAt ?? null,
      };
    },

    async trustMark(flowId, contentHash) {
      const trustedAt = Date.now() / 1000;
      mockTrust.set(`${flowId}::${contentHash}`, trustedAt);
      return { flowId, contentHash, trustedAt };
    },

    async trustRevoke(flowId, contentHash) {
      let removed = 0;
      if (contentHash) {
        if (mockTrust.delete(`${flowId}::${contentHash}`)) removed = 1;
      } else {
        for (const key of [...mockTrust.keys()]) {
          if (key.startsWith(`${flowId}::`)) {
            mockTrust.delete(key);
            removed += 1;
          }
        }
      }
      return { flowId, removed };
    },

    async debugInfo() {
      return MOCK_DEBUG;
    },

    async logsTail() {
      return "";
    },

    async exportDiagnostics() {
      return {
        path: "/tmp/lanius-diagnostics-mock",
        bytes: 128,
        filesIncluded: [
          "README.txt",
          "debug_info.json",
          "prefs.json",
          "secret_names.json",
          "trust_index.json",
        ],
        createdAt: Date.now() / 1000,
        archived: false,
        archivePath: null,
      };
    },

    async updaterList() {
      return {
        currentVersion: "0.2.0",
        draftsOmitted: true,
        installSupported: false,
        releasesPageUrl: "https://github.com/LaniusLab/LaniusDesktop/releases",
        releases: [
          {
            tag: "v0.2.0",
            name: "v0.2.0 (mock)",
            body: "Mock release for browser preview.",
            prerelease: false,
            publishedAt: "2026-10-01T00:00:00Z",
            htmlUrl: "https://github.com/LaniusLab/LaniusDesktop/releases/tag/v0.2.0",
            windowsAssets: [
              {
                name: "Lanius.Desktop_0.2.0_x64-setup.exe",
                url: "https://example.invalid/setup.exe",
                size: 1024,
                kind: "setupExe" as const,
              },
            ],
            preferredAsset: {
              name: "Lanius.Desktop_0.2.0_x64-setup.exe",
              url: "https://example.invalid/setup.exe",
              size: 1024,
              kind: "setupExe" as const,
            },
          },
        ],
      };
    },

    async updaterCheck() {
      return {
        status: "upToDate" as const,
        currentVersion: "0.2.0",
        latestTag: null,
        latestVersion: null,
        message: "updater.upToDate",
        preferredAsset: null,
      };
    },

    async updaterDownload(tag) {
      return {
        tag,
        fileName: "Lanius.Desktop_0.2.0_x64-setup.exe",
        path: "(browser)/updates/Lanius.Desktop_0.2.0_x64-setup.exe",
        bytes: 1024,
        kind: "setupExe" as const,
        checksumStatus: "unavailable" as const,
      };
    },

    async updaterInstall(path) {
      return { path, launched: false, mode: "interactiveInstaller" as const };
    },

    async updaterApply(tag) {
      const downloaded = await this.updaterDownload(tag);
      return {
        ...downloaded,
        launched: false,
        mode: null,
        installSkippedReason: "unsupportedPlatform",
      };
    },

    onUpdaterProgress() {
      return () => {};
    },

    async windowMinimize() {},
    async windowToggleMaximize() {},
    async windowIsMaximized() {
      return false;
    },
    async windowClose() {},
  };
}
