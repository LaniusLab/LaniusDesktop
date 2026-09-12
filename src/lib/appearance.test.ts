import { describe, expect, it, vi } from "vitest";

import { applyAppearance, resolveTheme } from "./appearance";
import { DEFAULT_PREFS } from "./prefs";

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("appearance", () => {
  it("system theme follows matchMedia", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
    mockMatchMedia(true);
    expect(resolveTheme("system")).toBe("dark");
    mockMatchMedia(false);
    expect(resolveTheme("system")).toBe("light");
  });

  it("applyAppearance writes root dataset; light clears theme", () => {
    applyAppearance({ ...DEFAULT_PREFS, theme: "dark", accent: "moss", font: "hei", locale: "en" });
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.accent).toBe("moss");
    expect(document.documentElement.dataset.font).toBe("hei");
    expect(document.documentElement.lang).toBe("en");

    applyAppearance({ ...DEFAULT_PREFS, theme: "light" });
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
