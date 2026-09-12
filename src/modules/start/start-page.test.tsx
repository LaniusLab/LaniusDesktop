import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  it("展示预设与人话步骤，不出现机器类型 ID", () => {
    render(<StartPage />);
    expect(screen.getByRole("heading", { name: "选择任务" })).toBeInTheDocument();
    expect(screen.getAllByText("给记事本写一句话").length).toBeGreaterThan(0);
    expect(screen.getByRole("checkbox", { name: "定位记事本" })).toBeInTheDocument();
    expect(screen.getByText("运行日志")).toBeInTheDocument();
    expect(screen.getByText("暂无日志")).toBeInTheDocument();
    expect(screen.getAllByRole("separator").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/window\.find/)).not.toBeInTheDocument();
    expect(screen.queryByText(/dry-run/i)).not.toBeInTheDocument();
  });

  it("可以取消勾选步骤", () => {
    render(<StartPage />);
    const step = screen.getByRole("checkbox", { name: "定位记事本" });
    expect(step).toHaveAttribute("aria-checked", "true");
    fireEvent.click(step);
    expect(step).toHaveAttribute("aria-checked", "false");
  });
});
