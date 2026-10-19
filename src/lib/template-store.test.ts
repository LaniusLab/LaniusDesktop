import { describe, expect, it } from "vitest";

import {
  TEMPLATE_STORAGE_KEY,
  parseStoredTemplate,
  readStoredTemplate,
  writeStoredTemplate,
} from "./template-store";

describe("template store", () => {
  it("读写本机草稿，损坏数据回落到示例", () => {
    const draft = readStoredTemplate();
    const first = draft.steps[0];
    if (!first) {
      throw new Error("示例模板不应为空");
    }
    writeStoredTemplate({
      ...draft,
      dirty: true,
      steps: [{ ...first, label: "草稿名" }, ...draft.steps.slice(1)],
    });
    expect(localStorage.getItem(TEMPLATE_STORAGE_KEY)).toContain("草稿名");
    expect(readStoredTemplate().steps[0]?.label).toBe("草稿名");
    expect(parseStoredTemplate({ nope: true })).toBeNull();
    localStorage.setItem(TEMPLATE_STORAGE_KEY, "{");
    expect(readStoredTemplate().dirty).toBe(false);
  });
});
