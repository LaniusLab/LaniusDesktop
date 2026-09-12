import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { bridge } from "@/lib/bridge";
import { useExecutionStore } from "@/stores/execution";
import { useUiStore } from "@/stores/ui";
import { TooltipProvider } from "@/ui";

import { AppLayout } from "./app-layout";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="outlet" />,
  useNavigate: () => navigate,
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: "/" } }),
}));

vi.mock("./titlebar", () => ({
  Titlebar: () => <div data-testid="titlebar" />,
}));

vi.mock("../search/global-search", () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
}));

vi.mock("@/lib/commands/registry", () => ({
  registry: {
    run: vi.fn().mockResolvedValue(true),
    list: () => [
      {
        id: "app.toggleTheme",
        title: "toggle",
        scope: "global",
        shortcut: "Mod+Shift+L",
        enabled: true,
        run: vi.fn(),
      },
      { id: "app.search", title: "search", scope: "global", shortcut: "Mod+K", enabled: true, run: vi.fn() },
      { id: "flow.run", title: "run", scope: "editor", shortcut: "Mod+Enter", enabled: true, run: vi.fn() },
    ],
  },
}));

describe("AppLayout", () => {
  afterEach(() => {
    useUiStore.setState({
      searchOpen: false,
      settingsOpen: false,
      sidebarCollapsed: false,
      sidebarWidth: 208,
    });
    useExecutionStore.setState({ engineStatus: "ready", engineUptimeMs: 0, phase: "idle" });
    vi.clearAllMocks();
  });

  it("renders shell chrome and dispatches shortcuts", async () => {
    const unsub = vi.fn();
    const onEngineEvent = vi.spyOn(bridge, "onEngineEvent").mockReturnValue(unsub);
    useExecutionStore.setState({ engineStatus: "ready", engineUptimeMs: 5000, phase: "idle" });
    const { registry } = await import("@/lib/commands/registry");

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <AppLayout />
        </TooltipProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("titlebar")).toBeInTheDocument();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByRole("separator", { name: /拖动调整左右宽度|Drag to resize width/i })).toBeInTheDocument();
    expect(screen.getByText(/已就绪|Ready/i)).toBeInTheDocument();
    expect(onEngineEvent).toHaveBeenCalled();

    // Dispatch engine callbacks through the subscribed handler.
    const handler = onEngineEvent.mock.calls[0]?.[0] as (event: {
      kind: string;
      status?: string;
      uptimeMs?: number;
      phase?: string;
      executionId?: string;
      traceId?: string;
      message?: string;
    }) => void;
    act(() => {
      handler({ kind: "status", status: "degraded", uptimeMs: 1200 });
    });
    expect(useExecutionStore.getState().engineStatus).toBe("degraded");
    act(() => {
      handler({ kind: "execution", phase: "running", executionId: "e1", traceId: "t1" });
    });
    expect(useExecutionStore.getState().phase).toBe("running");
    act(() => {
      handler({ kind: "log", message: "hello", traceId: "t1" });
    });
    expect(useExecutionStore.getState().logLines.at(-1)?.message).toBe("hello");

    // Shortcut assertions before opening search — avoids stale searchOpen in the keydown effect.
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    expect(registry.run).toHaveBeenCalledWith("flow.run", expect.anything());

    fireEvent.keyDown(window, { key: "l", ctrlKey: true, shiftKey: true });
    expect(registry.run).toHaveBeenCalledWith("app.toggleTheme", expect.anything());

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(useUiStore.getState().searchOpen).toBe(true);

    // Closing via store + waiting for re-render rebinds the listener with searchOpen=false.
    await act(async () => {
      useUiStore.setState({ searchOpen: false });
    });
    fireEvent.click(screen.getByRole("button", { name: /Search|搜索/i }));
    expect(useUiStore.getState().searchOpen).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /设置|Settings/i }));
    expect(useUiStore.getState().settingsOpen).toBe(true);
    await act(async () => {
      useUiStore.setState({ settingsOpen: false });
    });

    fireEvent.click(screen.getByRole("button", { name: /收起侧栏|Collapse sidebar/i }));
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /展开侧栏|Expand sidebar/i }));
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);

    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});