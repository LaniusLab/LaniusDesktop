import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "./context-menu";

describe("ContextMenu", () => {
  it("右键打开后点选并关闭", () => {
    const onSelect = vi.fn();
    render(
      <ContextMenu>
        <ContextMenuTrigger>右键区域</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={onSelect}>复制</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    expect(screen.queryByRole("menuitem", { name: "复制" })).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("右键区域"), { clientX: 24, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "复制" }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole("menuitem", { name: "复制" })).not.toBeInTheDocument();
  });
});
