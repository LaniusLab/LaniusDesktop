import { describe, expect, it, vi } from "vitest";

import { registry } from "./registry";
import type { CommandContext } from "./types";

function fakeContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    bridge: {
      engineInfo: vi.fn(),
      flowRun: vi.fn().mockResolvedValue({ executionId: "exec-1" }),
      flowCancel: vi.fn(),
      flowPause: vi.fn(),
      flowResume: vi.fn(),
      onEngineEvent: vi.fn(),
    } as unknown as CommandContext["bridge"],
    engine: { status: "ready" },
    execution: {
      phase: "idle",
      activeExecutionId: undefined,
      beginRun: vi.fn(),
      ingestRunResult: vi.fn(),
    },
    editor: {
      dirty: false,
      hasTarget: true,
      filePath: undefined,
      toFlowFile: () => ({ schemaVersion: 2, id: "t", name: "t", steps: [] }),
      saveTemplate: vi.fn(),
      loadFlowFile: vi.fn(),
      setFilePath: vi.fn(),
      markSaved: vi.fn(),
    },
    navigate: vi.fn(),
    ui: {
      prefs: { theme: "light", accent: "terracotta", font: "mixed", motion: "normal", locale: "zh-CN", closeBehavior: "quit", autostart: false, autoUpdate: false, blockAllDestructive: false, shortcuts: { palette: "Mod+K", run: "Mod+Enter" } },
      toggleTheme: vi.fn(),
      setSearchOpen: vi.fn(),
      setSettingsOpen: vi.fn(),
    },
    ...overrides,
  };
}

describe("命令注册表", () => {
  it("重复注册同一 id 直接抛错", () => {
    const command = { id: "test.dup", title: "重复", scope: "global" as const, run: vi.fn() };
    registry.register(command);
    expect(() => registry.register(command)).toThrow("命令重复注册");
  });

  it("快捷键冲突在注册期暴露", () => {
    registry.register({ id: "test.a", title: "A", scope: "global", shortcut: "Mod+9", run: vi.fn() });
    expect(() =>
      registry.register({ id: "test.b", title: "B", scope: "global", shortcut: "Mod+9", run: vi.fn() }),
    ).toThrow("快捷键冲突");
  });

  it("when 为 false 时命令不可执行", async () => {
    const run = vi.fn();
    registry.register({
      id: "test.gated",
      title: "门控",
      scope: "global",
      when: (ctx) => ctx.engine.status === "ready",
      run,
    });
    const blocked = await registry.run("test.gated", fakeContext({ engine: { status: "stopped" } }));
    expect(blocked).toBe(false);
    expect(run).not.toHaveBeenCalled();

    const allowed = await registry.run("test.gated", fakeContext());
    expect(allowed).toBe(true);
    expect(run).toHaveBeenCalledOnce();
  });

  it("list 返回每个命令的可用态", () => {
    const ctx = fakeContext({ engine: { status: "stopped" } });
    const gated = registry.list(ctx).find((c) => c.id === "test.gated");
    expect(gated?.enabled).toBe(false);
  });
});
