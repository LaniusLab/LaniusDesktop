import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { bridge } from "@/lib/bridge";
import { DEFAULT_PREFS } from "@/lib/prefs";
import { useUiStore } from "@/stores/ui";

import { Titlebar } from "./titlebar";

describe("自定义顶栏", () => {
  afterEach(() => {
    useUiStore.getState().replacePrefs({ ...DEFAULT_PREFS });
    useUiStore.setState({ settingsOpen: false });
    vi.restoreAllMocks();
  });

  it("提供主题快捷切换、设置、最小化、最大化与关闭", () => {
    const minimize = vi.spyOn(bridge, "windowMinimize").mockResolvedValue();
    const toggle = vi.spyOn(bridge, "windowToggleMaximize").mockResolvedValue();
    const close = vi.spyOn(bridge, "windowClose").mockResolvedValue();
    vi.spyOn(bridge, "windowIsMaximized").mockResolvedValue(false);

    const theme = useUiStore.getState().resolvedTheme;
    render(<Titlebar />);
    fireEvent.click(screen.getByRole("button", { name: "切换浅色 / 深色" }));
    expect(useUiStore.getState().resolvedTheme).not.toBe(theme);
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(useUiStore.getState().settingsOpen).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "最小化" }));
    fireEvent.click(screen.getByRole("button", { name: "最大化" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    expect(screen.getByRole("button", { name: "设置" })).toHaveClass("cursor-pointer", "hover:text-accent");
    expect(screen.getByRole("button", { name: "切换浅色 / 深色" })).toHaveClass(
      "cursor-pointer",
      "hover:text-accent",
    );
    expect(screen.getByRole("button", { name: "最小化" })).toHaveClass("cursor-pointer");
    expect(minimize).toHaveBeenCalled();
    expect(toggle).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
