import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import type { ShellDebugInfo } from "@/lib/gen/shell-debug";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";
import type {
  SecretDeleteResult,
  SecretGetResult,
  SecretListResult,
  SecretSetResult,
} from "@/lib/gen/shell-secret";
import type {
  UpdaterApplyResult,
  UpdaterCheckResult,
  UpdaterDownloadResult,
  UpdaterInstallResult,
  UpdaterListResult,
  UpdaterProgress,
} from "@/lib/gen/shell-updater";

import { normalizeEngineEvent } from "./normalize-engine-event";
import type { Bridge, EngineInfo, ExecutionPhase } from "./types";
import { isTerminalPhase, waitForExecutionResult } from "./wait-for-execution";

// 真实桥接：UI → Rust invoke → JSON-RPC → Python 引擎，见 docs/PROTOCOL.md §8
export function createTauriBridge(): Bridge {
  return {
    engineInfo() {
      return invoke<EngineInfo>("engine_info");
    },

    async flowRun(flow, mode) {
      // 先挂监听再 start，避免极短流程丢终态通知
      const seen = new Map<string, ExecutionPhase>();
      let wake: ((phase: ExecutionPhase, id: string) => void) | null = null;
      const unlisten = listen<unknown>("engine://event", (e) => {
        const event = normalizeEngineEvent(e.payload);
        if (
          event?.kind === "execution" &&
          event.executionId &&
          event.phase &&
          isTerminalPhase(event.phase)
        ) {
          seen.set(event.executionId, event.phase);
          wake?.(event.phase, event.executionId);
        }
      });
      try {
        const started = await invoke<{ executionId: string }>("flow_run", { flow, mode });
        return await waitForExecutionResult({
          executionId: started.executionId,
          alreadyTerminal: seen.get(started.executionId),
          watchTerminal: (handler) => {
            wake = handler;
            return () => {
              wake = null;
            };
          },
          fetchRecord: async (executionId) => {
            const page = await invoke<{ record: Record<string, unknown> }>("engine_call", {
              method: "execution.get",
              params: { executionId },
            });
            return page.record;
          },
        });
      } finally {
        const fn = await unlisten;
        fn();
      }
    },

    async flowCancel(executionId) {
      await invoke("flow_cancel", { executionId });
    },

    async flowPause(executionId) {
      await invoke("engine_call", {
        method: "flow.pause",
        params: { executionId },
      });
    },

    async flowResume(executionId) {
      await invoke("engine_call", {
        method: "flow.resume",
        params: { executionId },
      });
    },

    flowOpen(path) {
      return invoke("flow_open", { path });
    },

    flowSave(path, flow) {
      return invoke("flow_save", { path, flow });
    },

    flowValidate(flow) {
      return invoke("engine_call", {
        method: "flow.validate",
        params: { flow },
      });
    },

    onEngineEvent(handler) {
      const unlisten = listen<unknown>("engine://event", (e) => {
        const event = normalizeEngineEvent(e.payload);
        if (event) handler(event);
      });
      return () => {
        void unlisten.then((f) => f());
      };
    },

    prefsGet() {
      return invoke<ShellPrefs>("prefs_get");
    },

    prefsSet(prefs) {
      return invoke<ShellPrefs>("prefs_set", { prefs });
    },

    secretList() {
      return invoke<SecretListResult>("secret_list");
    },

    secretSet(key, value) {
      return invoke<SecretSetResult>("secret_set", { key, value });
    },

    secretGet(key) {
      return invoke<SecretGetResult>("secret_get", { key });
    },

    secretDelete(key) {
      return invoke<SecretDeleteResult>("secret_delete", { key });
    },

    debugInfo() {
      return invoke<ShellDebugInfo>("shell_debug_info");
    },

    logsTail() {
      return invoke<string>("logs_tail");
    },

    updaterList() {
      return invoke<UpdaterListResult>("updater_list");
    },

    updaterCheck() {
      return invoke<UpdaterCheckResult>("updater_check");
    },

    updaterDownload(tag, assetName) {
      return invoke<UpdaterDownloadResult>("updater_download", {
        tag,
        assetName: assetName ?? null,
      });
    },

    updaterInstall(path) {
      return invoke<UpdaterInstallResult>("updater_install", { path });
    },

    updaterApply(tag, assetName) {
      return invoke<UpdaterApplyResult>("updater_apply", {
        tag,
        assetName: assetName ?? null,
      });
    },

    onUpdaterProgress(handler) {
      const unlisten = listen<UpdaterProgress>("updater://progress", (e) => handler(e.payload));
      return () => {
        void unlisten.then((f) => f());
      };
    },

    windowMinimize() {
      return getCurrentWindow().minimize();
    },

    async windowToggleMaximize() {
      await getCurrentWindow().toggleMaximize();
    },

    windowIsMaximized() {
      return getCurrentWindow().isMaximized();
    },

    windowClose() {
      return getCurrentWindow().close();
    },
  };
}
