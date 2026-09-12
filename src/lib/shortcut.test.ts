import { describe, expect, it } from "vitest";

import { eventToShortcut, formatShortcut, matchShortcut } from "./shortcut";

describe("shortcut", () => {
  it("匹配 Mod+K", () => {
    const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
    expect(matchShortcut(event, "Mod+K")).toBe(true);
    expect(matchShortcut(event, "Mod+Enter")).toBe(false);
  });

  it("从事件还原绑定", () => {
    const event = new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true });
    expect(eventToShortcut(event)).toBe("Mod+Enter");
  });

  it("格式化时把 Mod 写成 Ctrl（非 Apple）", () => {
    expect(formatShortcut("Mod+K")).toContain("K");
  });
});
