import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useExecutionStore } from "@/stores/execution";

import { ExecutionLogPanel } from "./execution-log-panel";

describe("ExecutionLogPanel", () => {
  afterEach(() => {
    useExecutionStore.setState({ logLines: [], lastTraceId: undefined });
  });

  it("按级别过滤日志", () => {
    useExecutionStore.setState({
      logLines: [
        { ts: 1, message: "info line", level: "info", traceId: "t1" },
        { ts: 2, message: "error line", level: "error", traceId: "t1" },
        { ts: 3, message: "warn line", level: "warning", traceId: "t2" },
      ],
      lastTraceId: "t1",
    });
    render(<ExecutionLogPanel />);
    expect(screen.getByText("info line")).toBeInTheDocument();
    expect(screen.getByText("error line")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/日志级别|Log level/), { target: { value: "error" } });
    expect(screen.queryByText("info line")).not.toBeInTheDocument();
    expect(screen.getByText("error line")).toBeInTheDocument();
    expect(screen.queryByText("warn line")).not.toBeInTheDocument();
  });

  it("仅最近一次只保留 lastTraceId", () => {
    useExecutionStore.setState({
      logLines: [
        { ts: 1, message: "old", level: "info", traceId: "old-trace" },
        { ts: 2, message: "new", level: "info", traceId: "new-trace" },
      ],
      lastTraceId: "new-trace",
    });
    render(<ExecutionLogPanel />);
    fireEvent.click(screen.getByText(/仅最近一次|Latest only/));
    expect(screen.queryByText("old")).not.toBeInTheDocument();
    expect(screen.getByText("new")).toBeInTheDocument();
  });
});
