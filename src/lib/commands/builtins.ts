import { askLocalPath } from "@/lib/path-prompt";

import { registry } from "./registry";

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
    id: "flow.open",
    title: "打开流程文件",
    scope: "editor",
    shortcut: "Mod+O",
    run: async (ctx) => {
      const path = askLocalPath("打开流程文件路径（*.flow.json）", ctx.editor.filePath ?? "");
      if (!path) return;
      const opened = await ctx.bridge.flowOpen(path);
      ctx.editor.loadFlowFile(opened.flow, opened.path, {
        migratedFrom: opened.migratedFrom,
        migratedTo: opened.migratedTo,
      });
      ctx.navigate("/edit");
    },
  });

  registry.register({
    id: "flow.save",
    title: "保存模板",
    scope: "editor",
    shortcut: "Mod+S",
    run: async (ctx) => {
      // 有关联路径则写盘；否则仍落本机草稿（OS 对话框待 dialog 插件）
      const path = ctx.editor.filePath;
      if (!path) {
        ctx.editor.saveTemplate();
        return;
      }
      await ctx.bridge.flowSave(path, ctx.editor.toFlowFile());
      ctx.editor.markSaved();
    },
  });

  registry.register({
    id: "flow.saveAs",
    title: "另存为…",
    scope: "editor",
    shortcut: "Mod+Shift+S",
    run: async (ctx) => {
      const path = askLocalPath(
        "另存为路径（*.flow.json）",
        ctx.editor.filePath ?? "untitled.flow.json",
      );
      if (!path) return;
      await ctx.bridge.flowSave(path, ctx.editor.toFlowFile());
      ctx.editor.setFilePath(path);
      ctx.editor.markSaved();
    },
  });

  registry.register({
    id: "flow.run",
    title: "试一次",
    scope: "editor",
    shortcut: "Mod+Enter",
    when: (ctx) =>
      ctx.engine.status === "ready" &&
      ctx.editor.hasTarget &&
      ctx.execution.phase !== "running" &&
      ctx.execution.phase !== "validating" &&
      ctx.execution.phase !== "paused",
    run: async (ctx) => {
      const flow = ctx.editor.toFlowFile();
      const { gateFlowRun } = await import("@/lib/trust-gate");
      const gate = await gateFlowRun(ctx.bridge, flow, ctx.ui.prefs);
      if (!gate.ok) {
        if (gate.reason === "blocked") {
          throw new Error(gate.message);
        }
        return;
      }
      ctx.execution.beginRun({
        mode: "run",
        exe: flow.target?.match?.exe ?? "",
        channel: flow.target?.locate?.channel ?? "a11y",
        steps: (flow.steps ?? []).map((step) => ({ id: step.id, disabled: step.disabled })),
      });
      const result = await ctx.bridge.flowRun(flow, "run");
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
      ctx.editor.hasTarget &&
      ctx.execution.phase !== "running" &&
      ctx.execution.phase !== "validating" &&
      ctx.execution.phase !== "paused",
    run: async (ctx) => {
      // dry-run 走 mock，仍尊重 blockAllDestructive；未信任确认可跳过
      const flow = ctx.editor.toFlowFile();
      if (ctx.ui.prefs.blockAllDestructive) {
        const inspect = await ctx.bridge.flowInspect(flow);
        const destructive = inspect.dangerousSteps.filter((s) => s.dangerLevel === "destructive");
        if (destructive.length > 0) {
          throw new Error(
            `已禁止 destructive 节点：${destructive.map((s) => s.label).join("、")}`,
          );
        }
      }
      ctx.execution.beginRun({
        mode: "dryRun",
        exe: flow.target?.match?.exe ?? "",
        channel: flow.target?.locate?.channel ?? "a11y",
        steps: (flow.steps ?? []).map((step) => ({ id: step.id, disabled: step.disabled })),
      });
      const result = await ctx.bridge.flowRun(flow, "dryRun");
      ctx.execution.ingestRunResult(result);
    },
  });

  registry.register({
    id: "flow.pause",
    title: "暂停",
    scope: "editor",
    when: (ctx) =>
      Boolean(ctx.execution.activeExecutionId) && ctx.execution.phase === "running",
    run: async (ctx) => {
      const id = ctx.execution.activeExecutionId;
      if (!id) return;
      await ctx.bridge.flowPause(id);
    },
  });

  registry.register({
    id: "flow.resume",
    title: "继续",
    scope: "editor",
    when: (ctx) =>
      Boolean(ctx.execution.activeExecutionId) && ctx.execution.phase === "paused",
    run: async (ctx) => {
      const id = ctx.execution.activeExecutionId;
      if (!id) return;
      await ctx.bridge.flowResume(id);
    },
  });

  registry.register({
    id: "flow.cancel",
    title: "取消",
    scope: "editor",
    shortcut: "Escape",
    when: (ctx) =>
      Boolean(ctx.execution.activeExecutionId) &&
      (ctx.execution.phase === "running" ||
        ctx.execution.phase === "paused" ||
        ctx.execution.phase === "validating"),
    run: async (ctx) => {
      const id = ctx.execution.activeExecutionId;
      if (!id) return;
      await ctx.bridge.flowCancel(id);
    },
  });
}
