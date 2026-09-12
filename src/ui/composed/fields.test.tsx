import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CopyButton } from "./copy-button";
import { NumberField } from "./number-field";
import { SearchField } from "./search-field";

describe("SearchField", () => {
  it("输入与清除", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchField value="" onValueChange={onChange} placeholder="搜" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "流程" } });
    expect(onChange).toHaveBeenCalledWith("流程");
    rerender(<SearchField value="流程" onValueChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "清除" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("NumberField", () => {
  it("解析数字，空值回传 null", () => {
    const onChange = vi.fn();
    render(<NumberField value={3} onValueChange={onChange} aria-label="数量" />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "数量" }), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(null);
    fireEvent.change(screen.getByRole("spinbutton", { name: "数量" }), { target: { value: "12" } });
    expect(onChange).toHaveBeenCalledWith(12);
  });
});

describe("CopyButton", () => {
  it("写入剪贴板后切换文案", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<CopyButton value="hello" />);
    fireEvent.click(screen.getByRole("button", { name: "复制" }));
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(await screen.findByRole("button", { name: "已复制" })).toBeInTheDocument();
  });
});
