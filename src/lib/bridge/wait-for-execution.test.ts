import { describe, expect, it, vi } from "vitest";

import { isTerminalPhase, recordToFlowRunResult, waitForExecutionResult } from "./wait-for-execution";

describe("wait-for-execution", () => {
  it("detects terminal phases", () => {
    expect(isTerminalPhase("done")).toBe(true);
    expect(isTerminalPhase("running")).toBe(false);
  });

  it("maps execution record", () => {
    const result = recordToFlowRunResult({
      executionId: "e1",
      state: "done",
      mode: "dryRun",
      nodeRuns: [{ nodeId: "n1", status: "done", durationMs: 3, label: "日志" }],
      error: null,
    });
    expect(result).toEqual({
      executionId: "e1",
      finalState: "done",
      mode: "dryRun",
      nodeRuns: [{ nodeId: "n1", status: "done", durationMs: 3, errorCode: null, label: "日志" }],
      error: null,
    });
  });

  it("waits for terminal event then fetches record", async () => {
    const fetchRecord = vi.fn().mockResolvedValue({
      executionId: "e1",
      state: "done",
      mode: "run",
      nodeRuns: [],
    });
    let handler: ((phase: "done", id: string) => void) | undefined;
    const result = waitForExecutionResult({
      executionId: "e1",
      watchTerminal: (h) => {
        handler = h;
        return () => {
          handler = undefined;
        };
      },
      fetchRecord,
      timeoutMs: 1000,
    });
    handler?.("done", "e1");
    await expect(result).resolves.toMatchObject({ executionId: "e1", finalState: "done" });
    expect(fetchRecord).toHaveBeenCalledWith("e1");
  });
});
