import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import type { ShellDebugInfo } from "@/lib/gen/shell-debug";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";
import type {
  UpdaterApplyResult,
  UpdaterCheckResult,
  UpdaterDownloadResult,
  UpdaterInstallResult,
  UpdaterListResult,
  UpdaterProgress,
} from "@/lib/gen/shell-updater";

import type { Bridge, EngineEvent, EngineInfo, FlowRunResult } from "./types";

// 真实桥接：UI → Rust invoke → JSON-RPC → Python 引擎，见 docs/PROTOCOL.md §8
export function createTauriBridge(): Bridge {
  return {
    engineInfo() {
      return invoke<EngineInfo>("engine_info");
    },

    flowRun(flow, mode) {
      return invoke<FlowRunResult>("flow_run", { flow, mode });
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

    prefsGet() {
      return invoke<ShellPrefs>("prefs_get");
    },

    prefsSet(prefs) {
      return invoke<ShellPrefs>("prefs_set", { prefs });
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
