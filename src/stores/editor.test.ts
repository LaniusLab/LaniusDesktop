import { afterEach, describe, expect, it } from "vitest";

import { stepIssueKey } from "@/lib/template";
import { TEMPLATE_STORAGE_KEY, defaultStoredTemplate } from "@/lib/template-store";

import { redoEdit, undoEdit, useEditorStore } from "./editor";

function resetEditor() {
  const initial = defaultStoredTemplate();
  useEditorStore.setState({
    ...initial,
    selectedStepId: initial.steps[0]?.id,
  });
  useEditorStore.temporal.getState().clear();
}

describe("editor store", () => {
  afterEach(() => {
    localStorage.removeItem(TEMPLATE_STORAGE_KEY);
    resetEditor();
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
    useEditorStore.getState().saveTemplate();
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
    useEditorStore.getState().moveStep(0, 2);
    expect(useEditorStore.getState().steps.map((step) => step.id)).toEqual([
      ids[1],
      ids[2],
      ids[0],
    ]);
  });

  it("可把步骤标为这次不执行", () => {
    const id = useEditorStore.getState().steps[0]?.id;
    if (!id) {
      throw new Error("示例模板不应为空");
    }
    useEditorStore.getState().setStepDisabled(id, true);
    expect(useEditorStore.getState().steps[0]?.disabled).toBe(true);
  });

  it("可改步骤属性并写入本机草稿", () => {
    const id = useEditorStore.getState().steps[0]?.id;
    if (!id) {
      throw new Error("示例模板不应为空");
    }
    useEditorStore.getState().patchStep(id, { label: "多等一会", config: { ms: 800 } });
    expect(useEditorStore.getState().steps[0]?.label).toBe("多等一会");
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    expect(raw).toBeTruthy();
    if (!raw) {
      throw new Error("草稿应写入 localStorage");
    }
    expect(raw).toContain("多等一会");
  });
});

describe("stepIssueKey", () => {
  it("按键步骤缺 keys 时提示", () => {
    expect(
      stepIssueKey({
        id: "s",
        kind: "binding",
        type: "keyboard.press",
        label: "空",
        config: {},
      }),
    ).toBe("edit.issue.keys");
  });
});
