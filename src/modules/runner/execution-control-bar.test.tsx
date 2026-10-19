import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { registerBuiltinCommands } from "@/lib/commands/builtins";
import { registry } from "@/lib/commands/registry";
import { useExecutionStore } from "@/stores/execution";
import { TooltipProvider } from "@/ui";

import { ExecutionControlBar } from "./execution-control-bar";

vi.mock("@/lib/commands/context", () => ({
  currentContext: () => ({
    bridge: {
      flowRun: vi.fn(),
      flowPause: vi.fn(),
      flowResume: vi.fn(),
      flowCancel: vi.fn(),
    },
    engine: { status: "ready" },
    execution: {
      phase: useExecutionStore.getState().phase,
      activeExecutionId: useExecutionStore.getState().activeExecutionId,
      beginRun: vi.fn(),
      ingestRunResult: vi.fn(),
    },
    editor: {
      dirty: false,
      hasTarget: true,
      toFlowFile: () => ({ schemaVersion: 3, id: "t", name: "t", steps: [] }),
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
  }),
}));

describe("执行控制条", () => {
  beforeAll(() => {
    if (!registry.get("flow.pause")) {
      registerBuiltinCommands();
    }
  });

  it("运行中显示暂停与取消", () => {
    useExecutionStore.setState({
      phase: "running",
      activeExecutionId: "exec-1",
      pendingRun: {
        executionId: "exec-1",
        startedAt: Date.now(),
        mode: "run",
        exe: "notepad.exe",
        channel: "a11y",
      },
    });
    const spy = vi.spyOn(registry, "run").mockResolvedValue(true);
    render(
      <TooltipProvider>
        <ExecutionControlBar />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: /暂停|Pause/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /取消|Cancel/i }));
    expect(spy).toHaveBeenCalledWith("flow.cancel", expect.anything());
    spy.mockRestore();
  });
});
