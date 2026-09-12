import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("渲染执行状态的中文标签", () => {
    render(<StatusBadge state="running" />);
    expect(screen.getByText("运行中")).toBeInTheDocument();
  });

  it("空闲对人显示为就绪", () => {
    render(<StatusBadge state="idle" />);
    expect(screen.getByText("就绪")).toBeInTheDocument();
  });

  it("覆盖状态机全部终态", () => {
    const { rerender } = render(<StatusBadge state="done" />);
    expect(screen.getByText("完成")).toBeInTheDocument();
    rerender(<StatusBadge state="failed" />);
    expect(screen.getByText("失败")).toBeInTheDocument();
    rerender(<StatusBadge state="cancelled" />);
    expect(screen.getByText("已取消")).toBeInTheDocument();
  });
});
