import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/ui";

import { GalleryPage } from "./gallery-page";

describe("组件页", () => {
  it("渲染主要区块并打开 Overlay / Dialog", () => {
    render(<TooltipProvider><GalleryPage /></TooltipProvider>);
    expect(screen.getByRole("heading", { name: /组件|Components/i })).toBeInTheDocument();
    expect(screen.getByText("Button")).toBeInTheDocument();
    expect(screen.getByText("暂无流程")).toBeInTheDocument();
    expect(screen.getByText("引擎连接失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开 Overlay" }));
    expect(screen.getByRole("dialog", { name: "示例浮层" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    fireEvent.click(screen.getByRole("button", { name: "打开对话框" }));
    expect(screen.getByText("确认危险操作")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
  });

  it("切换 Tabs / Switch / ChoiceGroup", () => {
    render(<TooltipProvider><GalleryPage /></TooltipProvider>);
    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("aria-selected", "true");
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]!);
    fireEvent.click(screen.getByRole("radio", { name: /深色|Dark/i }));
  });
});
