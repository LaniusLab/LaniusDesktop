import { describe, expect, it } from "vitest";

import { toFlowFile } from "./flow-file";
import { createDemoSteps } from "./template";

describe("toFlowFile", () => {
  it("把模板步骤与目标窗口编进 schemaVersion 2", () => {
    const flow = toFlowFile({
      keymapProfileId: "default",
      match: { exe: "client.exe", title: "客户端", className: "UnityWndClass" },
      locate: { channel: "vision", source: "user", capture: "client", visionPack: "ocr-zh" },
      steps: createDemoSteps().map((step, index) =>
        index === 0 ? { ...step, disabled: true } : step,
      ),
    });
    expect(flow.schemaVersion).toBe(2);
    expect(flow.target?.match?.exe).toBe("client.exe");
    expect(flow.target?.locate?.channel).toBe("vision");
    expect(flow.steps?.[0]?.disabled).toBe(true);
    expect(flow.steps?.map((step) => step.kind)).toEqual(["preset", "binding", "mouse", "preset"]);
  });
});
