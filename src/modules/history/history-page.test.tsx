import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useExecutionStore } from "@/stores/execution";

import { HistoryPage } from "./history-page";

describe("运行记录页", () => {
  afterEach(() => {
    useExecutionStore.setState({ logLines: [], runs: [], stepStatuses: {} });
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
});
