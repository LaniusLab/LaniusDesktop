import { describe, expect, it } from "vitest";

import { filterGalleryGroups, GALLERY_GROUPS } from "./gallery-catalog";

describe("gallery-catalog", () => {
  it("空查询返回全部分组", () => {
    expect(filterGalleryGroups(GALLERY_GROUPS, "", (key) => key)).toHaveLength(GALLERY_GROUPS.length);
  });

  it("按组件名或关键词过滤", () => {
    const byTitle = filterGalleryGroups(GALLERY_GROUPS, "Button", (key) => key);
    expect(byTitle).toHaveLength(1);
    expect(byTitle[0]?.items.map((item) => item.id)).toEqual(["button"]);

    const byKeyword = filterGalleryGroups(GALLERY_GROUPS, "按键", (key) => key);
    expect(byKeyword.some((group) => group.items.some((item) => item.id === "recorder"))).toBe(true);
  });
});
