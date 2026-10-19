import { describe, expect, it } from "vitest";

import { useExecutionStore } from "./execution";

describe("execution store", () => {
  it("更新引擎状态、阶段与日志", () => {
    useExecutionStore.getState().setEngineStatus("starting", 10);
    expect(useExecutionStore.getState().engineStatus).toBe("starting");
    useExecutionStore.getState().setEngineStatus("ready", 1200);
    expect(useExecutionStore.getState().engineUptimeMs).toBe(1200);

    useExecutionStore.getState().setPhase("running", "exec-1", "trace-1");
    expect(useExecutionStore.getState().activeExecutionId).toBe("exec-1");
    expect(useExecutionStore.getState().lastTraceId).toBe("trace-1");

    useExecutionStore.getState().appendLog({ ts: 1, message: "a" });
    useExecutionStore.getState().appendLog({ ts: 2, message: "b", traceId: "t" });
    expect(useExecutionStore.getState().logLines.at(-1)?.message).toBe("b");

    useExecutionStore.getState().ingestRunResult({
      executionId: "exec-2",
      finalState: "done",
      mode: "run",
      nodeRuns: [{ nodeId: "s1", status: "done", durationMs: 3, label: "回车" }],
    });
    expect(useExecutionStore.getState().phase).toBe("done");
    expect(useExecutionStore.getState().logLines.at(-1)?.message).toBe("回车：完成");
    expect(useExecutionStore.getState().runs[0]?.executionId).toBe("exec-2");
    expect(useExecutionStore.getState().stepStatuses.s1).toBe("done");
  });

  it("beginRun 把禁用步骤标为跳过", () => {
    useExecutionStore.getState().beginRun({
      mode: "run",
      exe: "notepad.exe",
      channel: "a11y",
      steps: [
        { id: "a", disabled: true },
        { id: "b" },
      ],
    });
    expect(useExecutionStore.getState().stepStatuses).toEqual({ a: "skipped", b: "pending" });
    useExecutionStore.getState().noteStep("b", "running");
    expect(useExecutionStore.getState().activeStepId).toBe("b");
  });
});
