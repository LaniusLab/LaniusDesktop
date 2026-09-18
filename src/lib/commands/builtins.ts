import { registry } from "./registry";

// 内置命令。搜索 / 菜单 / 快捷键都只是这些实现的触发器（ADR-0007）
// 内置命令。搜索 / 菜单 / 快捷键都只是这些实现的触发器（ADR-0007）。
// 标题字符串会被 i18n 的 cmd.${id} 覆盖；此处中文仅作注册表兜底。
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
    title: "开始",
    scope: "global",
    shortcut: "Mod+1",
    run: (ctx) => ctx.navigate("/"),
  });

  registry.register({
    id: "nav.edit",
    title: "模板",
    scope: "global",
    shortcut: "Mod+2",
    run: (ctx) => ctx.navigate("/edit"),
  });

  registry.register({
    id: "nav.history",
    title: "运行记录",
    scope: "global",
    shortcut: "Mod+3",
    run: (ctx) => ctx.navigate("/history"),
  });

  registry.register({
    id: "nav.keymap",
    title: "按键映射",
    scope: "global",
    shortcut: "Mod+4",
    run: (ctx) => ctx.navigate("/keymap"),
  });

  registry.register({
    id: "nav.settings",
    title: "打开设置",
    scope: "global",
    shortcut: "Mod+,",
    run: (ctx) => ctx.ui.setSettingsOpen(true),
  });

  registry.register({
    id: "nav.gallery",
    title: "组件",
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
      const result = await ctx.bridge.flowRun(ctx.editor.toFlowFile(), "run");
      ctx.execution.ingestRunResult(result);
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
      const result = await ctx.bridge.flowRun(ctx.editor.toFlowFile(), "dryRun");
      ctx.execution.ingestRunResult(result);
    },
  });
}
