import { describe, expect, it } from "vitest";

import {
  createNotepadMultilineSteps,
  decodeStepDrag,
  encodeStepDrag,
  flattenSteps,
  materializeDraft,
  readStepDrag,
  writeStepDrag,
} from "./template";

describe("template dnd payload", () => {
  it("往返 palette 与 reorder 载荷", () => {
    const palette = encodeStepDrag({
      source: "palette",
      draft: { kind: "mouse", type: "mouse.click", label: "单击", config: { x: 0, y: 0 } },
    });
    expect(decodeStepDrag(palette)).toEqual({
      source: "palette",
      draft: { kind: "mouse", type: "mouse.click", label: "单击", config: { x: 0, y: 0 } },
    });
    const reorder = encodeStepDrag({ source: "reorder", id: "s-1" });
    expect(decodeStepDrag(reorder)).toEqual({ source: "reorder", id: "s-1" });
    expect(decodeStepDrag("nope")).toBeNull();
  });

  it("同时写入自定义 MIME 与 text/plain", () => {
    const store = new Map<string, string>();
    const transfer = {
      setData: (type: string, value: string) => {
        store.set(type, value);
      },
      getData: (type: string) => store.get(type) ?? "",
    };
    writeStepDrag(transfer, { source: "reorder", id: "s-9" });
    expect(readStepDrag(transfer)).toEqual({ source: "reorder", id: "s-9" });
    expect(store.has("application/x-lanius-step")).toBe(true);
  });
});

describe("template nesting helpers", () => {
  it("记事本预设含多行文本", () => {
    const steps = createNotepadMultilineSteps();
    const typed = steps.find((s) => s.type === "keyboard.type");
    expect(typed?.config.text).toContain("\n");
  });

  it("展平 if 分支含则/否则标记", () => {
    const ifStep = materializeDraft({
      kind: "control",
      type: "flow.if",
      label: "如果",
      config: { when: "ocr.contains", text: "确认" },
    });
    ifStep.then = [
      { id: "t1", kind: "preset", type: "core.log", label: "则日志", config: { message: "y" } },
    ];
    const rows = flattenSteps([ifStep]);
    expect(rows.some((r) => r.marker === "then")).toBe(true);
    expect(rows.some((r) => r.marker === "else")).toBe(true);
    expect(rows.some((r) => r.step.id === "t1" && r.branch === "then")).toBe(true);
  });
});
