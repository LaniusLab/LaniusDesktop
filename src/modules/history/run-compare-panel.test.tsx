import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { RunRecord } from "@/stores/execution";

import { RunComparePanel } from "./run-compare-panel";

function record(partial: Partial<RunRecord> & Pick<RunRecord, "executionId" | "mode">): RunRecord {
  return {
    startedAt: Date.UTC(2026, 0, 1, 12, 0, 0),
    finalState: "done",
    exe: "notepad.exe",
    channel: "a11y",
    doneCount: 1,
    skippedCount: 0,
    failedCount: 0,
    ...partial,
  };
}

describe("RunComparePanel", () => {
  it("无双侧轨迹时不渲染", () => {
    const { container } = render(
      <RunComparePanel
        runs={[
          record({
            executionId: "only-run",
            mode: "run",
            nodeRuns: [{ nodeId: "a", status: "done", durationMs: 1 }],
          }),
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("有预演与试一次时展示对照与一致文案", () => {
    const steps = [
      { nodeId: "a", status: "done" as const, durationMs: 1, label: "稍等片刻" },
      { nodeId: "b", status: "skipped" as const, durationMs: 0, label: "跳过步" },
    ];
    render(
      <RunComparePanel
        runs={[
          record({ executionId: "run-1", mode: "run", nodeRuns: steps }),
          record({ executionId: "dry-1", mode: "dryRun", nodeRuns: steps }),
        ]}
      />,
    );
    expect(screen.getByLabelText(/预演对照|Preview vs run/)).toBeInTheDocument();
    expect(screen.getByText(/轨迹一致|Trajectories match/)).toBeInTheDocument();
    expect(screen.getByText("稍等片刻")).toBeInTheDocument();
  });
});
