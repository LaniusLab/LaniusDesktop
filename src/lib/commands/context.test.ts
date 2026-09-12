import { describe, expect, it, vi } from "vitest";

import { currentContext, injectNavigate } from "./context";

describe("命令上下文", () => {
  it("注入 navigate 后可调用", () => {
    const nav = vi.fn();
    injectNavigate(nav);
    const ctx = currentContext();
    ctx.navigate("/settings");
    expect(nav).toHaveBeenCalledWith("/settings");
    ctx.ui.setSearchOpen(true);
    ctx.ui.toggleTheme();
  });
});
