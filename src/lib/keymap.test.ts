import { describe, expect, it } from "vitest";

import {
  ARROWS_PROFILE_ID,
  DEFAULT_PROFILE_ID,
  createDefaultKeymapState,
  createLockedDefaultMappings,
  isLockedProfile,
  mappingConflict,
  parseKeymap,
  pickableMappings,
  profileById,
  toCatalogItems,
} from "./keymap";

describe("keymap", () => {
  it("默认带两套方案，内置默认含常用按键", () => {
    const state = createDefaultKeymapState();
    expect(state.profiles).toHaveLength(2);
    const locked = profileById(state, DEFAULT_PROFILE_ID);
    const keys = locked?.mappings.map((mapping) => mapping.keys) ?? [];
    expect(keys.length).toBe(createLockedDefaultMappings().length);
    expect(keys).toEqual(expect.arrayContaining(["Up", "Enter", "A", "0", "F1", "Mod+C"]));
    const arrows = profileById(state, ARROWS_PROFILE_ID);
    expect(arrows?.mappings.map((mapping) => mapping.keys)).toEqual(["Up", "Left", "Down", "Right"]);
    expect(arrows?.mappings.map((mapping) => mapping.preset)).toEqual(["up", "left", "down", "right"]);
  });

  it("同套内名称冲突", () => {
    const state = createDefaultKeymapState();
    const arrows = profileById(state, ARROWS_PROFILE_ID);
    expect(arrows && mappingConflict(arrows, "Up", "other")).toBe(true);
    expect(arrows && mappingConflict(arrows, "Up", "m-up")).toBe(false);
    expect(arrows && mappingConflict(arrows, "", "other")).toBe(false);
  });

  it("只列出启用且已录按键的条目", () => {
    const state = createDefaultKeymapState();
    const arrows = profileById(state, ARROWS_PROFILE_ID);
    expect(arrows && pickableMappings(arrows)).toHaveLength(4);
    const catalog = arrows ? toCatalogItems(arrows, (preset) => preset) : [];
    expect(catalog.map((item) => item.mappingId)).toEqual(["m-up", "m-left", "m-down", "m-right"]);
    expect(catalog[0]).toMatchObject({ profileId: ARROWS_PROFILE_ID, keys: "Up", name: "up" });
  });

  it("损坏数据回落到默认，旧 from/to 迁到 name/keys", () => {
    expect(parseKeymap(null).activeId).toBe("default");
    expect(parseKeymap({ profiles: [] }).profiles.length).toBe(2);
    const parsed = parseKeymap({
      activeId: "custom",
      profiles: [{ id: "custom", name: "Mine", mappings: [{ id: "x", from: "Q", to: "E" }] }],
    });
    expect(parsed.activeId).toBe("custom");
    expect(parsed.profiles[0]?.id).toBe(DEFAULT_PROFILE_ID);
    expect(parsed.profiles.find((profile) => profile.id === "custom")?.mappings[0]).toMatchObject({
      name: "Q",
      keys: "E",
    });
  });

  it("始终补回锁定的默认方案，并丢掉对它的改动", () => {
    expect(isLockedProfile(DEFAULT_PROFILE_ID)).toBe(true);
    expect(isLockedProfile(ARROWS_PROFILE_ID)).toBe(false);
    const parsed = parseKeymap({
      activeId: "custom",
      profiles: [
        { id: DEFAULT_PROFILE_ID, name: "Hacked", mappings: [{ id: "x", name: "Q", keys: "E" }] },
        { id: "custom", name: "Mine", mappings: [] },
      ],
    });
    expect(parsed.profiles[0]?.id).toBe(DEFAULT_PROFILE_ID);
    expect(parsed.profiles[0]?.mappings.map((mapping) => mapping.keys)).toEqual(
      expect.arrayContaining(["Enter", "A", "Mod+C"]),
    );
    expect(parsed.profiles[0]?.mappings.some((mapping) => mapping.id === "x")).toBe(false);
    expect(parsed.profiles.some((profile) => profile.id === "custom")).toBe(true);
  });

  it("旧方向键 WASD 重映射升成宏表", () => {
    const parsed = parseKeymap({
      activeId: ARROWS_PROFILE_ID,
      profiles: [
        {
          id: ARROWS_PROFILE_ID,
          name: "Arrows",
          preset: "arrows",
          mappings: [
            { id: "m-w", from: "W", to: "Up" },
            { id: "m-a", from: "A", to: "Left" },
            { id: "m-s", from: "S", to: "Down" },
            { id: "m-d", from: "D", to: "Right" },
          ],
        },
      ],
    });
    expect(profileById(parsed, ARROWS_PROFILE_ID)?.mappings.map((mapping) => mapping.preset)).toEqual([
      "up",
      "left",
      "down",
      "right",
    ]);
  });
});
