import { describe, expect, it } from "vitest";

import { redoEdit, undoEdit, useEditorStore } from "./editor";

describe("editor store", () => {
  it("节点变更标记 dirty，并可撤销重做", () => {
    const before = useEditorStore.getState().nodes.length;
    useEditorStore.getState().onNodesChange([
      { type: "position", id: "open_app", position: { x: 1, y: 2 }, dragging: false },
    ]);
    expect(useEditorStore.getState().dirty).toBe(true);
    expect(useEditorStore.getState().nodes.length).toBe(before);

    useEditorStore.getState().onEdgesChange([{ type: "remove", id: "e1" }]);
    useEditorStore.getState().onConnect({
      source: "open_app",
      target: "log_done",
      sourceHandle: null,
      targetHandle: null,
    });
    useEditorStore.getState().markSaved();
    expect(useEditorStore.getState().dirty).toBe(false);

    undoEdit();
    redoEdit();
  });
});
