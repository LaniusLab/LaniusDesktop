import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_PREFS } from "@/lib/prefs";

import { useUiStore } from "./ui";

describe("ui store", () => {
  afterEach(() => {
    useUiStore.getState().replacePrefs({ ...DEFAULT_PREFS });
    useUiStore.setState({
      searchOpen: false,
      settingsOpen: false,
      sidebarCollapsed: false,
      sidebarWidth: 208,
      startTopHeight: 280,
      startLogWidth: 320,
      editorPaletteWidth: 192,
      editorInspectorWidth: 280,
      editorLogHeight: 140,
    });
  });

  it("patchPrefs 写入外观并切换主题", () => {
    useUiStore.getState().patchPrefs({ theme: "dark", accent: "moss" });
    expect(useUiStore.getState().prefs.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().prefs.theme).toBe("light");
    useUiStore.getState().setSearchOpen(true);
    expect(useUiStore.getState().searchOpen).toBe(true);
    useUiStore.getState().setSettingsOpen(true);
    expect(useUiStore.getState().settingsOpen).toBe(true);
    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().setSidebarWidth(240);
    expect(useUiStore.getState().sidebarWidth).toBe(240);
  });
});
