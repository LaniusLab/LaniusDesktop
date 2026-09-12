import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ARROWS_PROFILE_ID, createDefaultKeymapState } from "@/lib/keymap";
import { useKeymapStore } from "@/stores/keymap";
import { TooltipProvider } from "@/ui";

import { FlowsPage } from "./flows-page";

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Background: () => <div data-testid="rf-bg" />,
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

describe("编排页", () => {
  it("渲染画布与积木分组，并可触发试一次", async () => {
    const { registry } = await import("@/lib/commands/registry");
    render(<TooltipProvider><FlowsPage /></TooltipProvider>);
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
    expect(screen.getAllByText(/按键|Keys/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /试一次|Try once/i }));
    expect(registry.run).toHaveBeenCalledWith("flow.run", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: /预演|Preview/i }));
    expect(registry.run).toHaveBeenCalledWith("flow.dryRun", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: /撤销|Undo/i }));
    fireEvent.click(screen.getByRole("button", { name: /重做|Redo/i }));
  });

  it("按键分组可切换方案并列出映射表", () => {
    useKeymapStore.setState({
      ...createDefaultKeymapState(),
      activeId: ARROWS_PROFILE_ID,
      selectedId: ARROWS_PROFILE_ID,
    });
    render(
      <TooltipProvider>
        <FlowsPage />
      </TooltipProvider>,
    );
    expect(screen.getByLabelText("按键方案")).toBeInTheDocument();
    expect(screen.getByText("向上")).toBeInTheDocument();
    expect(screen.getByText("Up")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("按键方案"), { target: { value: "default" } });
    expect(screen.getByLabelText("按键方案")).toHaveValue("default");
    expect(screen.getByText("回车")).toBeInTheDocument();
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
  });
});
