import { bridge } from "@/lib/bridge";
import { useEditorStore } from "@/stores/editor";
import { useExecutionStore } from "@/stores/execution";
import { useUiStore } from "@/stores/ui";

import type { CommandContext } from "./types";

// 从活跃 store 装配命令上下文；navigate 由路由层注入以避免命令层反向依赖路由
// 从活跃 store 装配命令上下文；navigate 由路由层注入，避免命令层反向依赖路由。
let navigateFn: (to: string) => void = () => {
  throw new Error("命令上下文的 navigate 尚未注入");
};

export function injectNavigate(fn: (to: string) => void): void {
  navigateFn = fn;
}

export function currentContext(): CommandContext {
  return {
    bridge,
    engine: { status: useExecutionStore.getState().engineStatus },
    execution: { phase: useExecutionStore.getState().phase },
    editor: { dirty: useEditorStore.getState().dirty },
    navigate: (to) => navigateFn(to),
    ui: {
      toggleTheme: () => useUiStore.getState().toggleTheme(),
      setSearchOpen: (open) => useUiStore.getState().setSearchOpen(open),
    },
  };
}
