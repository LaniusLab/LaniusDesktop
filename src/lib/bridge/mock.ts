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

export function createMockBridge(): Bridge {
  const handlers = new Set<(event: EngineEvent) => void>();
  const emit = (event: EngineEvent) => handlers.forEach((h) => h(event));

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
        [500, { kind: "log", executionId, traceId, message: `[${mode}] core.log: 你好，Lanius` }],
        [900, { kind: "log", executionId, traceId, message: `[${mode}] core.wait: 等待 100ms` }],
        [1400, { kind: "execution", executionId, phase: "done", traceId }],
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
  };
}
