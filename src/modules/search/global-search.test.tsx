import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUiStore } from "@/stores/ui";

import { GlobalSearch } from "./global-search";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/commands/registry", () => ({
  registry: {
    list: () => [
      { id: "nav.flows", title: "前往：开始", scope: "global", enabled: true, run: vi.fn() },
      { id: "flow.run", title: "试一次", scope: "editor", enabled: true, run: vi.fn() },
    ],
    run: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/commands/context", () => ({
  injectNavigate: vi.fn(),
  currentContext: () => ({
    bridge: { flowRun: vi.fn() },
    engine: { status: "ready" },
    execution: { phase: "idle" },
    editor: { dirty: false },
    navigate: vi.fn(),
    ui: { toggleTheme: vi.fn(), setSearchOpen: vi.fn() },
  }),
}));

describe("全局搜索", () => {
  afterEach(() => {
    useUiStore.setState({ searchOpen: false });
  });

  it("打开后按查询过滤，不使用 dialog 角色之外的 Radix Dialog", () => {
    useUiStore.setState({ searchOpen: true });
    render(<GlobalSearch />);
    expect(screen.getByRole("dialog", { name: "搜索" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /前往：开始/ })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("搜索页面、任务、设置…"), {
      target: { value: "试" },
    });
    expect(screen.getByRole("option", { name: /试一次/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /前往：开始/ })).not.toBeInTheDocument();
  });
});
