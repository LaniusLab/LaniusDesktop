import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useEditorStore } from "@/stores/editor";
import { useExecutionStore } from "@/stores/execution";

import { HistoryPage } from "./history-page";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

describe("运行记录页", () => {
  afterEach(() => {
    useExecutionStore.setState({ logLines: [], runs: [], stepStatuses: {} });
    useEditorStore.setState({ selectedStepId: undefined });
    navigate.mockClear();
  });

  it("空列表显示 EmptyState", () => {
    render(<HistoryPage />);
    expect(screen.getByText(/暂无记录|No records/i)).toBeInTheDocument();
  });

  it("有运行摘要时展示完成计数", () => {
    useExecutionStore.setState({
      runs: [
        {
          executionId: "exec-1",
          startedAt: Date.UTC(2026, 0, 1, 12, 0, 0),
          mode: "run",
          finalState: "done",
          exe: "notepad.exe",
          channel: "a11y",
          doneCount: 3,
          skippedCount: 1,
          failedCount: 0,
        },
      ],
    });
    render(<HistoryPage />);
    expect(screen.getByText(/3 完成/)).toBeInTheDocument();
    expect(screen.getByText(/notepad\.exe/)).toBeInTheDocument();
  });

  it("失败记录可跳回模板失败步骤", () => {
    useExecutionStore.setState({
      runs: [
        {
          executionId: "exec-fail",
          startedAt: Date.UTC(2026, 0, 1, 12, 0, 0),
          mode: "run",
          finalState: "failed",
          exe: "notepad.exe",
          channel: "a11y",
          doneCount: 1,
          skippedCount: 0,
          failedCount: 1,
          failedStepId: "step-bad",
          errorMessage: "超时",
        },
      ],
    });
    render(<HistoryPage />);
    expect(screen.getByText(/1 失败/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /跳到失败步骤|Jump to failed step/ }));
    expect(useEditorStore.getState().selectedStepId).toBe("step-bad");
    expect(navigate).toHaveBeenCalledWith({ to: "/edit" });
  });
});
