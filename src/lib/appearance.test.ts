import { describe, expect, it } from "vitest";

import { applyAppearance, resolveTheme } from "./appearance";
import { DEFAULT_PREFS } from "./prefs";

describe("appearance", () => {
  it("system 主题跟随 matchMedia", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("system")).toBe("light");
  });

  it("applyAppearance 写入根节点 dataset", () => {
    applyAppearance({ ...DEFAULT_PREFS, theme: "dark", accent: "moss", font: "hei" });
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.accent).toBe("moss");
    expect(document.documentElement.dataset.font).toBe("hei");
  });
});
