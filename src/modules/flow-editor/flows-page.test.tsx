import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
    ui: { toggleTheme: vi.fn(), setSearchOpen: vi.fn() },
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
});
