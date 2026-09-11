import { registry } from "./registry";

// 内置命令。命令面板/菜单/快捷键都只是这些实现的触发器（ADR-0007）
export function registerBuiltinCommands(): void {
  registry.register({
    id: "app.toggleTheme",
    title: "切换深浅色主题",
    scope: "global",
    shortcut: "Mod+Shift+L",
    run: (ctx) => ctx.ui.toggleTheme(),
  });

  registry.register({
    id: "nav.flows",
    title: "前往：流程编排",
    scope: "global",
    shortcut: "Mod+1",
    run: (ctx) => ctx.navigate("/"),
  });

  registry.register({
    id: "nav.history",
    title: "前往：执行历史",
    scope: "global",
    shortcut: "Mod+2",
    run: (ctx) => ctx.navigate("/history"),
  });

  registry.register({
    id: "nav.settings",
    title: "前往：设置",
    scope: "global",
    shortcut: "Mod+,",
    run: (ctx) => ctx.navigate("/settings"),
  });

  registry.register({
    id: "flow.run",
    title: "运行流程",
    scope: "editor",
    shortcut: "Mod+Enter",
    when: (ctx) => ctx.engine.status === "ready" && ctx.execution.phase === "idle",
    run: async (ctx) => {
      await ctx.bridge.flowRun("run");
    },
  });

  registry.register({
    id: "flow.dryRun",
    title: "预演流程（dry-run）",
    scope: "editor",
    shortcut: "Mod+Shift+Enter",
    when: (ctx) => ctx.engine.status === "ready" && ctx.execution.phase === "idle",
    run: async (ctx) => {
      await ctx.bridge.flowRun("dryRun");
    },
  });
}
