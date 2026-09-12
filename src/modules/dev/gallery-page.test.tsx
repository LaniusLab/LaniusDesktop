import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/ui";

import { GalleryPage } from "./gallery-page";

describe("组件页", () => {
  it("渲染目录与主要区块，并打开 Overlay / Dialog", () => {
    render(
      <TooltipProvider>
        <GalleryPage />
      </TooltipProvider>,
    );
    expect(screen.getByRole("heading", { name: /组件|Components/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /组件目录|Component index/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Button", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SplitPane / Draggable", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Table / Pagination", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SearchField / NumberField / Textarea", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Menu / ContextMenu", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PageHeader", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "EmptyState / ErrorState / LoadingState", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "pagination" })).toBeInTheDocument();
    expect(screen.getByText("暂无流程")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建流程" })).toBeInTheDocument();
    expect(screen.getByText("引擎连接失败")).toBeInTheDocument();
    expect(screen.getByText("无法写入记录")).toBeInTheDocument();
    expect(screen.getByText("正在加载节点注册表…")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "PageHeader" }));
    expect(screen.getByRole("button", { name: "PageHeader" })).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "打开 Overlay" }));
    expect(screen.getByRole("dialog", { name: "示例浮层" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    fireEvent.click(screen.getByRole("button", { name: "打开对话框" }));
    expect(screen.getByText("确认危险操作")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
  });

  it("过滤目录并切换 Tabs / Switch / ChoiceGroup", () => {
    render(
      <TooltipProvider>
        <GalleryPage />
      </TooltipProvider>,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: /过滤组件|Filter components/i }), {
      target: { value: "zzzz-nope" },
    });
    expect(screen.getByText(/没有匹配的组件|No matching components/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Button", level: 2 })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /过滤组件|Filter components/i }), {
      target: { value: "页头" },
    });
    expect(screen.getByRole("heading", { name: "PageHeader", level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Button", level: 2 })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /过滤组件|Filter components/i }), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("switch", { name: "演示开关" }));
    fireEvent.click(screen.getByRole("radio", { name: /深色|Dark/i }));
  });
});
