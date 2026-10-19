import { describe, expect, it } from "vitest";

import { fromFlowFile, toFlowFile } from "./flow-file";
import { createNotepadMultilineSteps } from "./template";

describe("toFlowFile", () => {
  it("把模板步骤与目标窗口编进 schemaVersion 3", () => {
    const flow = toFlowFile({
      keymapProfileId: "default",
      match: { exe: "notepad.exe", title: "无标题 - 记事本", className: "Notepad" },
      locate: { channel: "a11y", source: "probe", capture: "client", visionPack: "template" },
      steps: createNotepadMultilineSteps().map((step, index) =>
        index === 0 ? { ...step, disabled: true } : step,
      ),
    });
    expect(flow.schemaVersion).toBe(3);
    expect(flow.target?.match?.exe).toBe("notepad.exe");
    expect(flow.target?.locate?.channel).toBe("a11y");
    expect(flow.steps?.[0]?.disabled).toBe(true);
    expect(flow.steps?.map((step) => step.type)).toEqual(["core.wait", "keyboard.type", "core.log"]);
  });

  it("序列化嵌套 control 分支", () => {
    const flow = toFlowFile({
      keymapProfileId: "default",
      match: { exe: "", title: "", className: "" },
      locate: { channel: "a11y", source: "probe", capture: "client", visionPack: "template" },
      steps: [
        {
          id: "if1",
          kind: "control",
          type: "flow.if",
          label: "如果",
          config: { when: "ocr.contains", text: "确认" },
          then: [
            {
              id: "t1",
              kind: "preset",
              type: "core.log",
              label: "则",
              config: { message: "yes" },
            },
          ],
          else: [],
        },
      ],
    });
    expect(flow.steps?.[0]?.then?.[0]?.id).toBe("t1");
  });
});

describe("fromFlowFile", () => {
  it("把 FlowFile 还原为编辑器草稿", () => {
    const flow = toFlowFile({
      id: "roundtrip",
      name: "往返",
      keymapProfileId: "default",
      match: { exe: "notepad.exe", title: "无标题 - 记事本", className: "Notepad" },
      locate: { channel: "a11y", source: "probe", capture: "client", visionPack: "template" },
      steps: createNotepadMultilineSteps(),
    });
    const draft = fromFlowFile(flow);
    expect(draft.id).toBe("roundtrip");
    expect(draft.name).toBe("往返");
    expect(draft.match.exe).toBe("notepad.exe");
    expect(draft.steps.map((step) => step.id)).toEqual(flow.steps?.map((step) => step.id));
  });
});
