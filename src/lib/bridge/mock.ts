import { DEFAULT_PREFS, mergePrefs } from "@/lib/prefs";
import type { ShellDebugInfo } from "@/lib/gen/shell-debug";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";
import type { Bridge, EngineEvent, EngineInfo, FlowNodeRun } from "./types";

/*
 * 浏览器开发 mock：pnpm dev 脱离 Tauri 运行时，用定时器模拟
 * 引擎心跳与一次执行的状态机流转，保证 UI 在纯浏览器里可开发。
 * 真实实现见 tauri.ts，两者必须保持同一 Bridge 契约。
 */

const MOCK_INFO: EngineInfo = {
  protocolVersion: "0.1.0",
  engineVersion: "0.1.0-mock",
  capabilities: ["dryRun", "template.steps", "locate.a11y"],
  nodeTypes: ["core.log", "core.wait", "keyboard.press", "mouse.click", "mouse.dblclick", "mouse.move"],
};

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

  let uptime = 0;
  let traceSeq = 0;

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
      const tick = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

      emit({ kind: "execution", executionId, phase: "validating", traceId });
      await tick(12);
      emit({ kind: "execution", executionId, phase: "running", traceId });
      emit({
        kind: "log",
        executionId,
        traceId,
        message: `${prefix}绑定 ${exe}（${channel}）`,
      });

      const nodeRuns: FlowNodeRun[] = [];
      for (const step of steps) {
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
        await tick(24);
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
          durationMs: 24,
          label: step.label,
        });
      }
      emit({ kind: "execution", executionId, phase: "done", traceId });
      await tick(12);
      emit({ kind: "execution", executionId, phase: "idle", traceId });
      return { executionId, finalState: "done", mode, nodeRuns };
    },

    async flowCancel() {
      // mock 执行太短，取消通常赶不上；契约保留
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

    async debugInfo() {
      return MOCK_DEBUG;
    },

    async logsTail() {
      return "";
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
