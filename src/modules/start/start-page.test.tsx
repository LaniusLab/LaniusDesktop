import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoSteps } from "@/lib/template";
import { PROCESS_CATALOG } from "@/lib/targets";
import { useEditorStore } from "@/stores/editor";

import { StartPage } from "./start-page";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/commands/registry", () => ({
  registry: {
    run: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("@/lib/commands/context", () => ({
  currentContext: () => ({
    bridge: { flowRun: vi.fn() },
    engine: { status: "ready" },
    execution: { phase: "idle" },
    editor: { dirty: false },
    navigate: vi.fn(),
    ui: { toggleTheme: vi.fn(), setSearchOpen: vi.fn(), setSettingsOpen: vi.fn() },
  }),
}));

describe("开始页", () => {
  afterEach(() => {
    const first = PROCESS_CATALOG[0];
    useEditorStore.setState({
      steps: createDemoSteps(),
      processId: first?.id ?? "notepad",
      match: first?.match,
      locate: first?.recommended,
    });
  });

  it("展示模板、进程与探测通道，不出现机器类型 ID", () => {
    render(<StartPage />);
    expect(screen.getByRole("heading", { name: "选择任务" })).toBeInTheDocument();
    expect(screen.getAllByText("记事本多行输入").length).toBeGreaterThan(0);
    expect(screen.getAllByText("对选定窗口跑模板").length).toBeGreaterThan(0);
    expect(screen.getByRole("checkbox", { name: "稍等片刻" })).toBeInTheDocument();
    expect(screen.getByLabelText("目标进程")).toHaveValue("notepad");
    expect(screen.getByText(/探测建议/)).toBeInTheDocument();
    expect(screen.getByText("运行日志")).toBeInTheDocument();
    expect(screen.queryByText(/window\.find/)).not.toBeInTheDocument();
    expect(screen.queryByText(/dry-run/i)).not.toBeInTheDocument();
  });

  it("可以取消勾选步骤，并改识别方式", () => {
    render(<StartPage />);
    const step = screen.getByRole("checkbox", { name: "稍等片刻" });
    expect(step).toHaveAttribute("aria-checked", "true");
    fireEvent.click(step);
    expect(step).toHaveAttribute("aria-checked", "false");
    expect(useEditorStore.getState().steps[0]?.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("目标进程"), { target: { value: "client" } });
    expect(useEditorStore.getState().locate.channel).toBe("vision");
    fireEvent.click(screen.getByRole("radio", { name: "控件" }));
    expect(useEditorStore.getState().locate.channel).toBe("a11y");
    expect(useEditorStore.getState().locate.source).toBe("user");
  });
});
