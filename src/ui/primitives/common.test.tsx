import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Breadcrumb } from "./breadcrumb";
import { Chip } from "./chip";
import { Collapsible } from "./collapsible";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "./menu";
import { Stepper } from "./stepper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { Toast, ToastStack } from "./toast";
import { Toggle, ToggleGroup } from "./toggle";

describe("Toggle / ToggleGroup", () => {
  it("切换按下态；分组可多选", () => {
    const onPressed = vi.fn();
    const onGroup = vi.fn();
    render(
      <>
        <Toggle pressed={false} onPressedChange={onPressed}>
          粗体
        </Toggle>
        <ToggleGroup
          type="multiple"
          value={["a"]}
          onValueChange={onGroup}
          items={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ]}
        />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "粗体" }));
    expect(onPressed).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onGroup).toHaveBeenCalledWith(["a", "b"]);
  });
});

describe("Chip", () => {
  it("可选中并可移除", () => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(
      <Chip selected onSelect={onSelect} onRemove={onRemove}>
        标签
      </Chip>,
    );
    fireEvent.click(screen.getByRole("button", { name: "标签" }));
    expect(onSelect).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "移除" }));
    expect(onRemove).toHaveBeenCalled();
  });
});

describe("Collapsible", () => {
  it("展开与收起内容", () => {
    render(
      <Collapsible title="分组" defaultOpen>
        内容
      </Collapsible>,
    );
    expect(screen.getByText("内容")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "分组" }));
    expect(screen.getByText("内容")).not.toBeVisible();
  });
});

describe("Table / Breadcrumb / Stepper / Toast", () => {
  it("渲染表格、路径、步骤与可关闭提示", () => {
    const onCrumb = vi.fn();
    const onClose = vi.fn();
    render(
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>打开记事本</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Breadcrumb
          items={[
            { label: "开始", onClick: onCrumb },
            { label: "编辑" },
          ]}
        />
        <Stepper
          current={1}
          steps={[
            { label: "校验" },
            { label: "运行" },
            { label: "完成" },
          ]}
        />
        <Toast title="已保存" onClose={onClose} />
      </>,
    );
    expect(screen.getByText("打开记事本")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "开始" }));
    expect(onCrumb).toHaveBeenCalled();
    expect(screen.getByText("运行")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("ToastStack 按 id 关闭", () => {
    const onDismiss = vi.fn();
    render(
      <ToastStack
        items={[{ id: "t1", title: "一条提示" }]}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(onDismiss).toHaveBeenCalledWith("t1");
  });
});

describe("Menu", () => {
  it("打开后点选菜单项并关闭", () => {
    const onSelect = vi.fn();
    render(
      <Menu>
        <MenuTrigger>操作</MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={onSelect}>复制</MenuItem>
        </MenuContent>
      </Menu>,
    );
    expect(screen.queryByRole("menuitem", { name: "复制" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "操作" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "复制" }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole("menuitem", { name: "复制" })).not.toBeInTheDocument();
  });
});
