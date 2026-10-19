import { afterEach, describe, expect, it } from "vitest";

import { useValidationStore } from "./validation";

describe("validation store", () => {
  afterEach(() => {
    useValidationStore.getState().clear();
  });

  it("按 nodeId 过滤 issue", () => {
    useValidationStore.getState().setResult(false, [
      {
        severity: "error",
        code: "engine.flow.validationFailed",
        nodeId: "a",
        message: "缺按键",
      },
      {
        severity: "error",
        code: "engine.flow.validationFailed",
        nodeId: "b",
        message: "文本空",
      },
    ]);
    expect(useValidationStore.getState().issuesFor("a")).toHaveLength(1);
    expect(useValidationStore.getState().ok).toBe(false);
  });
});
