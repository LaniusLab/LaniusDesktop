import { describe, expect, it } from "vitest";

import { collectHits, groupHits, highlightMatch, scoreText } from "./query";

const items = [
  { id: "nav.flows", title: "开始", enabled: true },
  { id: "flow.run", title: "试一次", shortcut: "Mod+Enter", enabled: true },
  { id: "app.toggleTheme", title: "切换深浅色主题", enabled: true },
  { id: "app.search", title: "全局搜索", enabled: true },
];

describe("搜索索引", () => {
  it("空查询列出条目，并排除打开搜索自身", () => {
    const hits = collectHits("", items);
    expect(hits.map((hit) => hit.id)).not.toContain("app.search");
    expect(hits).toHaveLength(3);
  });

  it("按标题命中并分组", () => {
    const hits = collectHits("试", items);
    expect(hits.map((hit) => hit.id)).toEqual(["flow.run"]);
    expect(groupHits(hits)).toEqual([
      { group: "run", hits: [expect.objectContaining({ id: "flow.run" })] },
    ]);
  });

  it("前缀比夹中得分高", () => {
    expect(scoreText("试一次", "试")).toBeGreaterThan(scoreText("先试一次", "试"));
  });

  it("高亮查询片段", () => {
    expect(highlightMatch("开始页", "开始")).toEqual([
      { text: "开始", match: true },
      { text: "页", match: false },
    ]);
  });
});
