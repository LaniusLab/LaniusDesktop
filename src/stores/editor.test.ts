import { afterEach, describe, expect, it } from "vitest";

import { createDemoSteps } from "@/lib/template";
import { PROCESS_CATALOG } from "@/lib/targets";

import { redoEdit, undoEdit, useEditorStore } from "./editor";

describe("editor store", () => {
  afterEach(() => {
    const first = PROCESS_CATALOG[0];
    useEditorStore.setState({
      steps: createDemoSteps(),
      keymapProfileId: "default",
      processId: first?.id ?? "",
      match: first?.match ?? { exe: "", title: "", className: "" },
      locate: first?.recommended ?? {
        channel: "a11y",
        source: "probe",
        capture: "client",
        visionPack: "template",
      },
      dirty: false,
    });
  });

  it("插入步骤标记 dirty，并可撤销", () => {
    const before = useEditorStore.getState().steps.length;
    useEditorStore.getState().insertStep({
      kind: "preset",
      type: "core.log",
      label: "额外日志",
      config: { message: "x", level: "info" },
    });
    expect(useEditorStore.getState().dirty).toBe(true);
    expect(useEditorStore.getState().steps.length).toBe(before + 1);
    undoEdit();
    expect(useEditorStore.getState().steps.length).toBe(before);
    redoEdit();
    expect(useEditorStore.getState().steps.length).toBe(before + 1);
    useEditorStore.getState().markSaved();
    expect(useEditorStore.getState().dirty).toBe(false);
  });

  it("选进程时写入探测通道，手动改通道记为 user", () => {
    useEditorStore.getState().bindProcess("client");
    expect(useEditorStore.getState().match.exe).toBe("client.exe");
    expect(useEditorStore.getState().locate.channel).toBe("vision");
    expect(useEditorStore.getState().locate.source).toBe("probe");
    useEditorStore.getState().setLocateChannel("a11y");
    expect(useEditorStore.getState().locate.channel).toBe("a11y");
    expect(useEditorStore.getState().locate.source).toBe("user");
  });

  it("可把步骤移到指定位置", () => {
    const ids = useEditorStore.getState().steps.map((step) => step.id);
    useEditorStore.getState().moveStep(0, 3);
    expect(useEditorStore.getState().steps.map((step) => step.id)).toEqual([
      ids[1],
      ids[2],
      ids[3],
      ids[0],
    ]);
  });
});
