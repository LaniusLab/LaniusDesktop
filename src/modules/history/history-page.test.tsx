import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useExecutionStore } from "@/stores/execution";

import { HistoryPage } from "./history-page";

describe("运行记录页", () => {
  afterEach(() => {
    useExecutionStore.setState({ logLines: [] });
  });

  it("空列表显示 EmptyState", () => {
    render(<HistoryPage />);
    expect(screen.getByText(/暂无记录|No records/i)).toBeInTheDocument();
  });

  it("有日志时按时间展示", () => {
    useExecutionStore.setState({
      logLines: [{ ts: Date.UTC(2026, 0, 1, 12, 0, 0), message: "hello-log" }],
    });
    render(<HistoryPage />);
    expect(screen.getByText("hello-log")).toBeInTheDocument();
  });
});
