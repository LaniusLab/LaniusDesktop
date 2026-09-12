import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Overlay } from "./overlay";

describe("Overlay", () => {
  it("Escape 与点击背景关闭，Tab 在焦点环内循环", () => {
    const onOpenChange = vi.fn();
    render(
      <Overlay open onOpenChange={onOpenChange} title="trap">
        <button type="button">one</button>
        <button type="button">two</button>
      </Overlay>,
    );
    expect(screen.getByRole("dialog", { name: "trap" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    render(
      <Overlay open onOpenChange={onOpenChange} title="bg">
        <button type="button">inside</button>
      </Overlay>,
    );
    fireEvent.click(screen.getByRole("button", { name: "bg" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    const onOpenChange2 = vi.fn();
    render(
      <Overlay open onOpenChange={onOpenChange2} title="tab">
        <button type="button">first</button>
        <button type="button">last</button>
      </Overlay>,
    );
    const first = screen.getByRole("button", { name: "first" });
    const last = screen.getByRole("button", { name: "last" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  });
});
