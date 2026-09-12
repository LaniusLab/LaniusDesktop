import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Pagination, paginationItems } from "./pagination";

describe("paginationItems", () => {
  it("页数少时列出全部", () => {
    expect(paginationItems(1, 0)).toEqual([]);
    expect(paginationItems(1, 1)).toEqual([1]);
    expect(paginationItems(2, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("页数多时夹省略号", () => {
    expect(paginationItems(1, 20, 1)).toEqual([1, 2, "ellipsis", 20]);
    expect(paginationItems(5, 20, 1)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 20]);
    expect(paginationItems(20, 20, 1)).toEqual([1, "ellipsis", 19, 20]);
  });
});

describe("Pagination", () => {
  it("上一页 / 下一页 / 页码", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageCount={4} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "上一页" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "第 4 页" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
    expect(screen.getByRole("button", { name: "第 2 页" })).toHaveAttribute("aria-current", "page");
  });
});
