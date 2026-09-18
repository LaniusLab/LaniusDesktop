import { describe, expect, it } from "vitest";

import { decodeStepDrag, encodeStepDrag } from "./template";

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
});
