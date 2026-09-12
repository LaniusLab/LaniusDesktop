import { describe, expect, it } from "vitest";

import { commandShortcut, DEFAULT_PREFS, mergePrefs } from "./prefs";

describe("prefs", () => {
  it("缺字段时回落到默认值", () => {
    const merged = mergePrefs({ theme: "dark" });
    expect(merged.theme).toBe("dark");
    expect(merged.accent).toBe(DEFAULT_PREFS.accent);
    expect(merged.shortcuts.palette).toBe("Mod+K");
  });

  it("把可改快捷键映射到命令 id", () => {
    const prefs = mergePrefs({ shortcuts: { palette: "Mod+P", run: "Mod+R" } });
    expect(commandShortcut("app.search", prefs, "Mod+K")).toBe("Mod+P");
    expect(commandShortcut("flow.run", prefs, "Mod+Enter")).toBe("Mod+R");
    expect(commandShortcut("nav.flows", prefs, "Mod+1")).toBe("Mod+1");
  });
});
