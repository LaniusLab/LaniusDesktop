import { DEFAULT_PREFS, mergePrefs } from "@/lib/prefs";
import type { ShellDebugInfo } from "@/lib/gen/shell-debug";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";

import type { Bridge, EngineEvent, EngineInfo } from "./types";

/*
 * 浏览器开发 mock：pnpm dev 脱离 Tauri 运行时，用定时器模拟
 * 引擎心跳与一次执行的状态机流转，保证 UI 在纯浏览器里可开发。
 * 真实实现见 tauri.ts，两者必须保持同一 Bridge 契约。
 */

const MOCK_INFO: EngineInfo = {
  protocolVersion: "0.1.0",
  engineVersion: "0.1.0-mock",
  capabilities: ["dryRun"],
  nodeTypes: ["core.log", "core.wait", "mouse.click", "keyboard.type", "window.find"],
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

    async flowRun(mode) {
      const executionId = `mock-exec-${++traceSeq}`;
      const traceId = `mock-trace-${traceSeq.toString().padStart(4, "0")}`;
      const steps: Array<[number, EngineEvent]> = [
        [0, { kind: "execution", executionId, phase: "validating", traceId }],
        [300, { kind: "execution", executionId, phase: "running", traceId }],
        [
          500,
          {
            kind: "log",
            executionId,
            traceId,
            message: mode === "dryRun" ? "演练：记下完成" : "记下：你好，Lanius",
          },
        ],
        [900, { kind: "log", executionId, traceId, message: "等了一小会" }],
        [1400, { kind: "execution", executionId, phase: "done", traceId }],
        [1800, { kind: "execution", executionId, phase: "idle", traceId }],
      ];
      for (const [delay, event] of steps) {
        setTimeout(() => emit(event), delay);
      }
      return { executionId };
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

    async updaterCheck() {
      return {
        status: "unavailable",
        currentVersion: "0.1.0",
        message: "updater.notConfigured",
      };
    },

    async windowMinimize() {},
    async windowToggleMaximize() {},
    async windowIsMaximized() {
      return false;
    },
    async windowClose() {},
  };
}
