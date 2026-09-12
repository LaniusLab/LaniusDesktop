import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { SplitPane } from "./split-pane";

beforeAll(() => {
  const proto = HTMLElement.prototype;
  if (!proto.setPointerCapture) {
    proto.setPointerCapture = function setPointerCapture() {
      return undefined;
    };
  }
  if (!proto.releasePointerCapture) {
    proto.releasePointerCapture = function releasePointerCapture() {
      return undefined;
    };
  }
  if (!proto.hasPointerCapture) {
    proto.hasPointerCapture = function hasPointerCapture() {
      return true;
    };
  }
});

function mockBox(node: HTMLElement, width: number, height: number): void {
  Object.defineProperty(node, "clientWidth", { configurable: true, value: width });
  Object.defineProperty(node, "clientHeight", { configurable: true, value: height });
}

describe("SplitPane", () => {
  it("横向拖动会改第一栏宽度", () => {
    const onSizeChange = (size: number) => {
      sizes.push(size);
    };
    const sizes: number[] = [];
    render(
      <SplitPane label="调整宽度" defaultSize={200} min={80} minSecond={80} onSizeChange={onSizeChange}>
        <div>左栏</div>
        <div>右栏</div>
      </SplitPane>,
    );
    const root = screen.getByText("左栏").closest("[data-split]") as HTMLElement;
    mockBox(root, 800, 400);
    const handle = screen.getByRole("separator", { name: "调整宽度" });
    const down = createEvent.pointerDown(handle, { button: 0, pointerId: 1 });
    Object.defineProperty(down, "clientX", { value: 200 });
    fireEvent(handle, down);
    expect(handle).toHaveAttribute("data-dragging", "true");
    const move = createEvent.pointerMove(handle, { pointerId: 1 });
    Object.defineProperty(move, "clientX", { value: 260 });
    fireEvent(handle, move);
    expect(sizes.at(-1)).toBe(260);
  });

  it("方向键可以微调", () => {
    const sizes: number[] = [];
    render(
      <SplitPane
        label="调整宽度"
        size={200}
        min={80}
        minSecond={80}
        onSizeChange={(size) => sizes.push(size)}
      >
        <div>左栏</div>
        <div>右栏</div>
      </SplitPane>,
    );
    const root = screen.getByText("左栏").closest("[data-split]") as HTMLElement;
    mockBox(root, 800, 400);
    fireEvent.keyDown(screen.getByRole("separator", { name: "调整宽度" }), { key: "ArrowRight" });
    expect(sizes.at(-1)).toBe(216);
  });
});
