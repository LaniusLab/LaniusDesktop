import { beforeAll, describe, expect, it, vi } from "vitest";

import { toFlowFile } from "@/lib/flow-file";
import { registerBuiltinCommands } from "./builtins";
import { registry } from "./registry";
import type { CommandContext } from "./types";

const sampleFlow = toFlowFile({
  keymapProfileId: "default",
  match: { exe: "notepad.exe", title: "", className: "" },
  locate: { channel: "a11y", source: "probe", capture: "client", visionPack: "template" },
  steps: [],
});

function ctx(partial: Partial<CommandContext> = {}): CommandContext {
  return {
    bridge: {
      flowRun: vi.fn().mockResolvedValue({ executionId: "e1" }),
      flowOpen: vi.fn().mockResolvedValue({
        path: "/tmp/a.flow.json",
        flow: sampleFlow,
        migratedFrom: 3,
        migratedTo: 3,
      }),
      flowSave: vi.fn().mockResolvedValue({ path: "/tmp/a.flow.json" }),
    } as unknown as CommandContext["bridge"],
    engine: { status: "ready" },
    execution: { phase: "idle", beginRun: vi.fn(), ingestRunResult: vi.fn() },
    editor: {
      dirty: false,
      hasTarget: true,
      filePath: undefined,
      toFlowFile: () => sampleFlow,
      saveTemplate: vi.fn(),
      loadFlowFile: vi.fn(),
      setFilePath: vi.fn(),
      markSaved: vi.fn(),
    },
    navigate: vi.fn(),
    ui: { toggleTheme: vi.fn(), setSearchOpen: vi.fn(), setSettingsOpen: vi.fn() },
    ...partial,
  };
}

describe("内置命令", () => {
  beforeAll(() => {
    if (!registry.get("app.search")) {
      registerBuiltinCommands();
    }
  });

  it("注册导航与主题命令", async () => {
    const c = ctx();
    await registry.run("nav.flows", c);
    await registry.run("nav.edit", c);
    await registry.run("nav.history", c);
    await registry.run("nav.keymap", c);
    await registry.run("nav.settings", c);
    await registry.run("nav.gallery", c);
    await registry.run("app.search", c);
    await registry.run("app.toggleTheme", c);
    expect(c.navigate).toHaveBeenCalledWith("/");
    expect(c.navigate).toHaveBeenCalledWith("/edit");
    expect(c.navigate).toHaveBeenCalledWith("/history");
    expect(c.navigate).toHaveBeenCalledWith("/keymap");
    expect(c.ui.setSettingsOpen).toHaveBeenCalledWith(true);
    expect(c.navigate).toHaveBeenCalledWith("/gallery");
    expect(c.ui.setSearchOpen).toHaveBeenCalledWith(true);
    expect(c.ui.toggleTheme).toHaveBeenCalled();
  });

  it("flow.run / dryRun 受引擎状态门控", async () => {
    const ready = ctx();
    await registry.run("flow.run", ready);
    await registry.run("flow.dryRun", ready);
    expect(ready.bridge.flowRun).toHaveBeenCalledWith(sampleFlow, "run");
    expect(ready.bridge.flowRun).toHaveBeenCalledWith(sampleFlow, "dryRun");
    expect(ready.execution.beginRun).toHaveBeenCalledTimes(2);
    expect(ready.execution.ingestRunResult).toHaveBeenCalledTimes(2);

    const busy = ctx({
      execution: { phase: "running", beginRun: vi.fn(), ingestRunResult: vi.fn() },
    });
    const listed = registry.list(busy).filter((cmd) => cmd.id === "flow.run" || cmd.id === "flow.dryRun");
    expect(listed.every((cmd) => !cmd.enabled)).toBe(true);
  });

  it("未选目标窗口时不能试一次，仍可保存草稿", async () => {
    const save = vi.fn();
    const blocked = ctx({
      editor: {
        dirty: true,
        hasTarget: false,
        filePath: undefined,
        toFlowFile: () => sampleFlow,
        saveTemplate: save,
        loadFlowFile: vi.fn(),
        setFilePath: vi.fn(),
        markSaved: vi.fn(),
      },
    });
    expect(registry.list(blocked).find((cmd) => cmd.id === "flow.run")?.enabled).toBe(false);
    await registry.run("flow.save", blocked);
    expect(save).toHaveBeenCalledOnce();
  });

  it("有 filePath 时 flow.save 走桥接写盘", async () => {
    const markSaved = vi.fn();
    const c = ctx({
      editor: {
        dirty: true,
        hasTarget: true,
        filePath: "/tmp/a.flow.json",
        toFlowFile: () => sampleFlow,
        saveTemplate: vi.fn(),
        loadFlowFile: vi.fn(),
        setFilePath: vi.fn(),
        markSaved,
      },
    });
    await registry.run("flow.save", c);
    expect(c.bridge.flowSave).toHaveBeenCalledWith("/tmp/a.flow.json", sampleFlow);
    expect(markSaved).toHaveBeenCalledOnce();
  });

  it("flow.open 载入流程并跳转模板页", async () => {
    const loadFlowFile = vi.fn();
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("/tmp/a.flow.json");
    const c = ctx({
      editor: {
        dirty: false,
        hasTarget: true,
        filePath: undefined,
        toFlowFile: () => sampleFlow,
        saveTemplate: vi.fn(),
        loadFlowFile,
        setFilePath: vi.fn(),
        markSaved: vi.fn(),
      },
    });
    await registry.run("flow.open", c);
    expect(c.bridge.flowOpen).toHaveBeenCalledWith("/tmp/a.flow.json");
    expect(loadFlowFile).toHaveBeenCalledWith(sampleFlow, "/tmp/a.flow.json");
    expect(c.navigate).toHaveBeenCalledWith("/edit");
    prompt.mockRestore();
  });
});
