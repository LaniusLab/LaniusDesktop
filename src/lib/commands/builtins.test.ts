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
    bridge: { flowRun: vi.fn().mockResolvedValue({ executionId: "e1" }) } as unknown as CommandContext["bridge"],
    engine: { status: "ready" },
    execution: { phase: "idle", ingestRunResult: vi.fn() },
    editor: { dirty: false, toFlowFile: () => sampleFlow },
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

    const busy = ctx({ execution: { phase: "running", ingestRunResult: vi.fn() } });
    const listed = registry.list(busy).filter((cmd) => cmd.id.startsWith("flow."));
    expect(listed.every((cmd) => !cmd.enabled)).toBe(true);
  });
});
