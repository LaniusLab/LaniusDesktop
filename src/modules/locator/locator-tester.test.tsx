import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LocatorTester } from "./locator-tester";

const elementFind = vi.fn().mockResolvedValue({
  found: true,
  handle: "hwnd-1",
  elementId: "el-1",
  summary: { name: "确定", automationId: "btnOk", controlType: "Button" },
});

vi.mock("@/lib/bridge", () => ({
  bridge: {
    elementFind: (...args: unknown[]) => elementFind(...args),
  },
}));

describe("LocatorTester", () => {
  it("填写名称后测试定位并展示结果", async () => {
    render(
      <LocatorTester
        match={{ exe: "notepad.exe", title: "", className: "Notepad" }}
        locate={{
          channel: "a11y",
          source: "user",
          capture: "client",
          visionPack: "template",
        }}
      />,
    );
    expect(screen.getByText("元素定位器测试")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("名称"), { target: { value: "确定" } });
    fireEvent.click(screen.getByRole("button", { name: "测试定位" }));
    await waitFor(() => {
      expect(elementFind).toHaveBeenCalled();
    });
    expect(elementFind.mock.calls[0]?.[0]).toMatchObject({
      match: { exe: "notepad.exe", className: "Notepad" },
      locator: { name: "确定" },
    });
    await waitFor(() => {
      expect(screen.getByText("找到元素")).toBeInTheDocument();
    });
    expect(screen.getByText(/hwnd-1/)).toBeInTheDocument();
  });
});
