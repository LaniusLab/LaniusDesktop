import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_PREFS } from "@/lib/prefs";

import { useUiStore } from "./ui";

describe("ui store", () => {
  afterEach(() => {
    useUiStore.getState().replacePrefs({ ...DEFAULT_PREFS });
    useUiStore.setState({ searchOpen: false });
  });

  it("patchPrefs 写入外观并切换主题", () => {
    useUiStore.getState().patchPrefs({ theme: "dark", accent: "moss" });
    expect(useUiStore.getState().prefs.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().prefs.theme).toBe("light");
    useUiStore.getState().setSearchOpen(true);
    expect(useUiStore.getState().searchOpen).toBe(true);
  });
});
