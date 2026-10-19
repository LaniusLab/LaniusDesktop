import { describe, expect, it } from "vitest";

import { layoutMindTree, stepsToMindTree } from "./mind-map";
import { createNotepadMultilineSteps } from "./template";

describe("mind-map", () => {
  it("从记事本预设投影出目标与步骤节点", () => {
    const tree = stepsToMindTree({
      name: "记事本多行输入",
      match: { exe: "notepad.exe", title: "无标题 - 记事本", className: "Notepad" },
      locate: { channel: "a11y", source: "probe", capture: "client", visionPack: "template" },
      steps: createNotepadMultilineSteps(),
    });
    expect(tree.nodes.some((n) => n.id === "target")).toBe(true);
    expect(tree.nodes.map((n) => n.stepId).filter(Boolean)).toEqual([
      "wait_focus",
      "type_body",
      "log_done",
    ]);
    const layout = layoutMindTree(tree);
    expect(layout.width).toBeGreaterThan(100);
    expect(layout.nodes.length).toBe(tree.nodes.length);
  });
});
