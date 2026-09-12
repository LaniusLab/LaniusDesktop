import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { bridge } from "@/lib/bridge";

import { Titlebar } from "./titlebar";

describe("自定义顶栏", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("提供最小化、最大化与关闭", () => {
    const minimize = vi.spyOn(bridge, "windowMinimize").mockResolvedValue();
    const toggle = vi.spyOn(bridge, "windowToggleMaximize").mockResolvedValue();
    const close = vi.spyOn(bridge, "windowClose").mockResolvedValue();
    vi.spyOn(bridge, "windowIsMaximized").mockResolvedValue(false);

    render(<Titlebar />);
    fireEvent.click(screen.getByRole("button", { name: "最小化" }));
    fireEvent.click(screen.getByRole("button", { name: "最大化" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    expect(minimize).toHaveBeenCalled();
    expect(toggle).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
