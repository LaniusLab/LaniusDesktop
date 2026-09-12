import { describe, expect, it } from "vitest";

import { eventToShortcut, formatShortcut, isApplePlatform, matchShortcut } from "./shortcut";

describe("shortcut", () => {
  it("matches Mod+K / Enter / comma", () => {
    expect(matchShortcut(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }), "Mod+K")).toBe(true);
    expect(matchShortcut(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }), "Mod+Enter")).toBe(true);
    expect(matchShortcut(new KeyboardEvent("keydown", { key: ",", ctrlKey: true }), "Mod+," )).toBe(true);
    expect(matchShortcut(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }), "Mod+Enter")).toBe(false);
    expect(
      matchShortcut(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, shiftKey: true }), "Mod+K"),
    ).toBe(false);
  });

  it("rebuilds binding from event; ignores bare modifiers", () => {
    expect(eventToShortcut(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }))).toBe("Mod+Enter");
    expect(eventToShortcut(new KeyboardEvent("keydown", { key: ",", altKey: true, ctrlKey: true }))).toBe(
      "Mod+Alt+,",
    );
    expect(eventToShortcut(new KeyboardEvent("keydown", { key: "Control" }))).toBeNull();
    expect(eventToShortcut(new KeyboardEvent("keydown", { key: "F5" }))).toBeNull();
  });

  it("formats Mod as Ctrl on non-Apple", () => {
    expect(formatShortcut("Mod+K")).toContain("K");
    expect(formatShortcut("Mod+Shift+Enter")).toContain("Ctrl");
  });

  it("Apple platform uses Meta and glyphs", () => {
    const original = window.navigator.platform;
    Object.defineProperty(window.navigator, "platform", { configurable: true, get: () => "MacIntel" });
    try {
      expect(isApplePlatform()).toBe(true);
      expect(matchShortcut(new KeyboardEvent("keydown", { key: "k", metaKey: true }), "Mod+K")).toBe(true);
      const label = formatShortcut("Mod+Shift+Alt+Enter");
      expect(label.includes("Ctrl")).toBe(false);
      expect(label.length).toBeGreaterThan(0);
    } finally {
      Object.defineProperty(window.navigator, "platform", { configurable: true, get: () => original });
    }
  });
});

