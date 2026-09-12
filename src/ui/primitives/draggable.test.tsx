import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { Draggable } from "./draggable";

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

describe("Draggable", () => {
  it("指针拖动后写入位移", () => {
    render(<Draggable>可拖动</Draggable>);
    const node = screen.getByText("可拖动");
    node.getBoundingClientRect = () => ({
      x: 100,
      y: 80,
      left: 100,
      top: 80,
      right: 220,
      bottom: 140,
      width: 120,
      height: 60,
      toJSON: () => ({}),
    });
    const down = createEvent.pointerDown(node, { button: 0, pointerId: 1 });
    Object.defineProperty(down, "clientX", { value: 110 });
    Object.defineProperty(down, "clientY", { value: 90 });
    fireEvent(node, down);
    expect(node).toHaveAttribute("data-dragging", "true");
    const move = createEvent.pointerMove(node, { pointerId: 1 });
    Object.defineProperty(move, "clientX", { value: 150 });
    Object.defineProperty(move, "clientY", { value: 120 });
    fireEvent(node, move);
    expect(node.style.transform).toBe("translate(40px, 30px)");
    fireEvent.pointerUp(node, { pointerId: 1 });
    expect(node).not.toHaveAttribute("data-dragging");
  });

  it("默认夹在视口内，不能整块拖出窗口", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 400 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 300 });
    render(<Draggable>夹紧</Draggable>);
    const node = screen.getByText("夹紧");
    node.getBoundingClientRect = () => ({
      x: 20,
      y: 20,
      left: 20,
      top: 20,
      right: 140,
      bottom: 80,
      width: 120,
      height: 60,
      toJSON: () => ({}),
    });
    const down = createEvent.pointerDown(node, { button: 0, pointerId: 1 });
    Object.defineProperty(down, "clientX", { value: 30 });
    Object.defineProperty(down, "clientY", { value: 30 });
    fireEvent(node, down);
    const move = createEvent.pointerMove(node, { pointerId: 1 });
    Object.defineProperty(move, "clientX", { value: -200 });
    Object.defineProperty(move, "clientY", { value: -200 });
    fireEvent(node, move);
    expect(node.style.transform).toBe("translate(-20px, -20px)");
    fireEvent.pointerUp(node, { pointerId: 1 });
  });

  it("enabled=false 时不位移", () => {
    render(<Draggable enabled={false}>固定</Draggable>);
    const node = screen.getByText("固定");
    fireEvent.pointerDown(node, { clientX: 10, clientY: 10, button: 0, pointerId: 1 });
    fireEvent.pointerMove(node, { clientX: 80, clientY: 80, pointerId: 1 });
    expect(node.style.transform).toBe("translate(0px, 0px)");
  });
});
