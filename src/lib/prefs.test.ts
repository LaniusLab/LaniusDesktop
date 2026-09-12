import { describe, expect, it } from "vitest";

import {
  commandShortcut,
  DEFAULT_PREFS,
  mergePrefs,
  PREFS_STORAGE_KEY,
  readStoredPrefs,
  writeStoredPrefs,
} from "./prefs";

describe("prefs", () => {
  it("缺字段时回落到默认值", () => {
    const merged = mergePrefs({ theme: "dark" });
    expect(merged.theme).toBe("dark");
    expect(merged.accent).toBe(DEFAULT_PREFS.accent);
    expect(merged.shortcuts.palette).toBe("Mod+K");
    expect(mergePrefs(null).theme).toBe(DEFAULT_PREFS.theme);
    expect(mergePrefs("x").theme).toBe(DEFAULT_PREFS.theme);
  });

  it("把可改快捷键映射到命令 id", () => {
    const prefs = mergePrefs({ shortcuts: { palette: "Mod+P", run: "Mod+R" } });
    expect(commandShortcut("app.search", prefs, "Mod+K")).toBe("Mod+P");
    expect(commandShortcut("flow.run", prefs, "Mod+Enter")).toBe("Mod+R");
    expect(commandShortcut("nav.flows", prefs, "Mod+1")).toBe("Mod+1");
  });

  it("读写 localStorage，损坏 JSON 时回落", () => {
    localStorage.clear();
    expect(readStoredPrefs().theme).toBe(DEFAULT_PREFS.theme);
    writeStoredPrefs({ ...DEFAULT_PREFS, theme: "dark" });
    expect(localStorage.getItem(PREFS_STORAGE_KEY)).toContain("dark");
    expect(readStoredPrefs().theme).toBe("dark");
    localStorage.setItem(PREFS_STORAGE_KEY, "{not-json");
    expect(readStoredPrefs().theme).toBe(DEFAULT_PREFS.theme);
  });
});
