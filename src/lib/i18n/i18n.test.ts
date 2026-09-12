import { describe, expect, it } from "vitest";

import { en } from "./en";
import { translate } from "./index";
import { zhCN } from "./zh-CN";

describe("i18n", () => {
  it("替换占位符", () => {
    expect(translate("zh-CN", "engine.uptime", { seconds: 12 })).toBe("已运行 12 秒");
  });

  it("缺词条时回落到中文，再回落到 key", () => {
    expect(translate("en", "brand.name")).toBe("Lanius");
    expect(translate("en", "does.not.exist")).toBe("does.not.exist");
  });

  it("中英词条 key 对齐", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zhCN).sort());
  });
});
