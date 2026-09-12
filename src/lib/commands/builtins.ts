import { registry } from "./registry";

// 内置命令。搜索 / 菜单 / 快捷键都只是这些实现的触发器（ADR-0007）
export function registerBuiltinCommands(): void {
  registry.register({
    id: "app.search",
    title: "搜索",
    scope: "global",
    shortcut: "Mod+K",
    run: (ctx) => ctx.ui.setSearchOpen(true),
  });

  registry.register({
    id: "app.toggleTheme",
    title: "切换浅色 / 深色主题",
    scope: "global",
    shortcut: "Mod+Shift+L",
    run: (ctx) => ctx.ui.toggleTheme(),
  });

  registry.register({
    id: "nav.flows",
    title: "前往：开始",
    scope: "global",
    shortcut: "Mod+1",
    run: (ctx) => ctx.navigate("/"),
  });

  registry.register({
    id: "nav.edit",
    title: "前往：编辑",
    scope: "global",
    shortcut: "Mod+2",
    run: (ctx) => ctx.navigate("/edit"),
  });

  registry.register({
    id: "nav.history",
    title: "前往：运行记录",
    scope: "global",
    shortcut: "Mod+3",
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
    id: "nav.gallery",
    title: "前往：组件",
    scope: "global",
    shortcut: "Mod+5",
    run: (ctx) => ctx.navigate("/gallery"),
  });

  registry.register({
    id: "flow.run",
    title: "试一次",
    scope: "editor",
    shortcut: "Mod+Enter",
    when: (ctx) =>
      ctx.engine.status === "ready" &&
      ctx.execution.phase !== "running" &&
      ctx.execution.phase !== "validating",
    run: async (ctx) => {
      await ctx.bridge.flowRun("run");
    },
  });

  registry.register({
    id: "flow.dryRun",
    title: "预演",
    scope: "editor",
    shortcut: "Mod+Shift+Enter",
    when: (ctx) =>
      ctx.engine.status === "ready" &&
      ctx.execution.phase !== "running" &&
      ctx.execution.phase !== "validating",
    run: async (ctx) => {
      await ctx.bridge.flowRun("dryRun");
    },
  });
}
