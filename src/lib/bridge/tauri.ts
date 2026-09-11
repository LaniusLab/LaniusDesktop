import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type { Bridge, EngineEvent, EngineInfo } from "./types";

// 真实桥接：UI → Rust invoke → JSON-RPC → Python 引擎，见 docs/PROTOCOL.md §8
export function createTauriBridge(): Bridge {
  return {
    engineInfo() {
      return invoke<EngineInfo>("engine_info");
    },

    flowRun(mode) {
      return invoke<{ executionId: string }>("flow_run", { mode });
    },

    async flowCancel(executionId) {
      await invoke("flow_cancel", { executionId });
    },

    onEngineEvent(handler) {
      const unlisten = listen<EngineEvent>("engine://event", (e) => handler(e.payload));
      return () => {
        void unlisten.then((f) => f());
      };
    },
  };
}
